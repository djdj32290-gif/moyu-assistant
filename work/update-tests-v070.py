from pathlib import Path
p = Path(__file__).resolve().parent / 'tests' / 'verify.cjs'
s = p.read_text(encoding='utf-8')
start = s.index("    await ui.locator('#saved-toggle').click();")
end = s.index("    await nestedItem.locator('.rule-check').uncheck();", start)
s = s[:start] + '''    assert.equal(await ui.locator('#saved-toggle').count(), 0);
    assert.equal(await ui.locator('#library').isVisible(), false);
    assert.equal(await ui.locator('#editor').isVisible(), true);
    assert.equal(await ui.locator('#level-rail').isVisible(), true);
    await ui.getByRole('button', { name: '取消修改并返回', exact: true }).click();
    assert.equal(await ui.locator('#library').isVisible(), true);
    assert.ok(Math.abs((await page.locator('#nested-example').boundingBox()).width - 300) < 1);
    check('Editing has no saved-count button; cancel discards preview and returns to saved list');
''' + s[end:]
s = s.replace("    await realUI.locator('#saved-toggle').click();", "    await realUI.locator('#cancel-edit').click();")
s = s.replace("    assert.equal(await realUI.locator('#saved-summary').textContent(), '已保存 1 项');", "    assert.equal(await realUI.locator('#saved-summary').count(), 0);")
anchor = "    const tabsBefore = context.pages().length;"
s = s.replace(anchor, '''    await realUI.locator('#editor-thumbnail-button').waitFor({ state: 'visible' });
    const editorPreview = await realUI.locator('#editor-thumbnail-button').boundingBox(), nameBox = await realUI.locator('#name').boundingBox(), saveBox = await realUI.locator('#save').boundingBox();
    assert.ok(editorPreview.y >= nameBox.y + nameBox.height && editorPreview.y + editorPreview.height <= saveBox.y);
    const editingThumbnail = await realUI.locator('#editor-thumbnail').getAttribute('src');
    await realUI.locator('#editor-thumbnail-button').dblclick();
    assert.equal(await realUI.locator('#preview-image').getAttribute('src'), editingThumbnail);
    await testPage.keyboard.press('Escape');
    assert.equal(await realUI.locator('#editor').isVisible(), true);
    await testPage.screenshot({ path: path.join(root, 'outputs', '修改状态截图预览.png') });
    check('Automatically captured screenshot appears under the name and above Save; double-click opens the same preview and Escape keeps the draft');
''' + anchor)
anchor = "    const previewBox = await realManager.locator('#preview-image').boundingBox();"
s = s.replace(anchor, '''    const imageBorder = await realUI.locator('#preview-image').evaluate(node => { const css = getComputedStyle(node); return { width: css.borderTopWidth, color: css.borderTopColor, style: css.borderTopStyle }; });
    assert.deepEqual(imageBorder, { width: '2px', color: 'rgb(0, 0, 0)', style: 'solid' });
''' + anchor)
anchor = "    await context.close(); context = null;\n    fs.writeFileSync"
assert anchor in s
s = s.replace(anchor, '''    await worker.evaluate(async baseURL => {
      const key = 'point-resize:v1:127.0.0.1', profile = (await chrome.storage.local.get(key))[key], first = profile.rules[0];
      const record = (id, label, route) => ({ ...structuredClone(first), id, label, name: label, value: 100, layers: first.layers.map(rule => ({ ...rule, value: 100 })), ...(route ? { pageURL: new URL(route, baseURL).href } : {}) });
      const legacy = record('legacy-record', '旧版设置'); delete legacy.pageURL;
      profile.rules.push(record('home-record', '首页设置', '/app/bbs/home?sort=new'), record('post-a', '帖子设置 A', '/app/bbs/link/195373245'), record('post-b', '帖子设置 B', '/app/bbs/link/195373246?source=feed#comments'), legacy);
      await chrome.storage.local.set({ [key]: profile });
    }, url);
    await testPage.evaluate(() => history.replaceState({}, '', '/app/bbs/home'));
    await browserCDP.send('Extensions.triggerAction', { id: extensionId, targetId: targetInfo.targetId });
    const homeGroup = realUI.locator('#rules .page-group[data-page="/app/bbs/home"]'), postGroup = realUI.locator('#rules .page-group[data-page="/app/bbs/link/*"]');
    await homeGroup.waitFor({ state: 'visible' });
    assert.equal(await homeGroup.evaluate(node => node.open), true);
    assert.equal(await postGroup.evaluate(node => node.open), false);
    assert.equal(await postGroup.locator('.rule').count(), 2, 'different numeric post IDs share one page-type group');
    assert.equal(await realUI.locator('#rules .page-group[data-page=""] .rule').count(), 1, 'legacy record retained');
    const homeName = await homeGroup.locator('.rule-name input').inputValue(); assert.equal(homeName, '首页设置');
    await postGroup.locator('summary').click();
    assert.equal(await postGroup.getByRole('button', { name: '到网页调整', exact: true }).count(), 2);
    await testPage.screenshot({ path: path.join(root, 'outputs', '同网站页面分类预览.png') });
    await realUI.locator('#manage').click();
    const groupedSite = realUI.locator('.site-group[data-site="127.0.0.1"]');
    await groupedSite.waitFor({ state: 'visible' });
    assert.equal(await groupedSite.locator('.page-group').count(), 4);
    await realUI.locator('#site-search').fill('/app/bbs/link/');
    assert.equal(await groupedSite.locator('.page-group').count(), 1);
    assert.equal(await groupedSite.locator('.rule').count(), 2);
    await realUI.locator('#all-back').click();
    assert.equal(await realUI.locator('#rule-count').textContent(), '5');
    check('Same website records split by page type: home versus posts, numeric IDs merge, query/hash do not split, legacy items retained, path search works in all records');
    await context.route('**/app/bbs/link/*', async route => {
      const html = fs.readFileSync(path.join(source, 'demo.html'), 'utf8').replace(/<script[^>]*><\\/script>/g, '').replace('<head>', '<head><base href="' + url + '">');
      await route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
    });
    const targetPagePromise = context.waitForEvent('page');
    await realUI.locator('#rules .page-group[data-page="/app/bbs/link/*"] .rule[aria-label="帖子设置 A"]').getByRole('button', { name: '到网页调整', exact: true }).click();
    const targetPage = await targetPagePromise, targetUI = targetPage.locator('#point-resize-ui');
    await targetUI.locator('#editor').waitFor({ state: 'visible' });
    assert.match(targetPage.url(), /\\/app\\/bbs\\/link\\/195373245$/);
    assert.equal(await targetUI.locator('#name').inputValue(), '帖子设置 A');
    assert.equal(await targetUI.locator('#number').inputValue(), '100');
    assert.equal(await realUI.locator('#editor').isVisible(), false, 'record for another page type must not be edited against the home page');
    const routeStorage = await worker.evaluate(() => chrome.storage.local.get('point-resize:v1:127.0.0.1'));
    assert.equal(routeStorage['point-resize:v1:127.0.0.1'].rules.length, 5);
    await targetPage.close();
    check('Edit from another page-type group opens the saved content page, not a same-host homepage; records and existing scope are preserved');
    await context.close(); context = null;
    fs.writeFileSync''')
p.write_text(s, encoding='utf-8')
print('Updated existing regression suite and added page grouping/preview coverage')
