from pathlib import Path
p = Path(__file__).resolve().parent / 'tests' / 'verify.cjs'
s = p.read_text(encoding='utf-8')
def rep(old, new):
    global s
    assert old in s, old[:100]
    s = s.replace(old, new)
rep("    const managerPromise = context.waitForEvent('page'); await ui.locator('#manage').click(); const manager = await managerPromise; await manager.waitForLoadState(); await page.bringToFront();\n    assert.equal(await ui.locator('#rules').count(), 0, 'saved items are outside the settings panel');", """    const manager = ui;
    await ui.locator('#library').waitFor({ state: 'visible' });
    assert.equal(await ui.locator('#editor').isVisible(), false);
    assert.equal(await ui.locator('.rule').count(), 1);
    check('Saving returns to the current website list inside the same floating panel');""")
rep("    await nestedItem.locator('.rule-check').uncheck();", """    await ui.locator('#number').fill('47'); await ui.locator('#number').dispatchEvent('change');
    await ui.locator('#saved-toggle').click();
    assert.equal(await ui.locator('#library').isVisible(), true);
    assert.equal(await ui.locator('#editor').isVisible(), false);
    assert.equal(await ui.locator('#level-rail').isVisible(), false);
    await ui.locator('#saved-toggle').click();
    assert.equal(await ui.locator('#number').inputValue(), '47');
    assert.equal(await ui.locator('#level-rail').isVisible(), true);
    await ui.locator('#cancel-edit').click();
    assert.equal(await ui.locator('#library').isVisible(), true);
    assert.ok(Math.abs((await page.locator('#nested-example').boundingBox()).width - 300) < 1);
    check('Expand/collapse list preserves draft and layers; cancel restores the saved size and returns to list');
    await nestedItem.getByRole('button', { name: '调整', exact: true }).click();
    await ui.locator('#saved-toggle').click();
    await nestedItem.locator('.rule-check').uncheck();""")
rep("    await realUI.locator('#save').click();\n    const realManagerPromise = context.waitForEvent('page'); await realUI.locator('#manage').click(); const realManager = await realManagerPromise; await realManager.waitForLoadState();", """    assert.ok((await realUI.locator('#name').boundingBox()).y > (await realUI.locator('#similar').boundingBox()).y);
    const tabsBefore = context.pages().length;
    await realUI.locator('#save').click();
    const realManager = realUI;
    await realUI.locator('#library').waitFor({ state: 'visible' });
    assert.equal(await realUI.locator('#editor').isVisible(), false);
    assert.equal(context.pages().length, tabsBefore);""")
rep("    assert.ok((await realUI.locator('#name').boundingBox()).y > (await realUI.locator('#similar').boundingBox()).y);\n    const entries", "    const entries")
s = s.replace("realManager.locator('#preview')", "realManager.locator('#image-viewer')")
s = s.replace("await realManager.screenshot(", "await testPage.screenshot(").replace("await realManager.keyboard.press(", "await testPage.keyboard.press(")
s = s.replace("Independent manager: larger centered context screenshot", "Inline records: larger centered context screenshot")
s = s.replace("'保存管理页预览.png'", "'默认保存列表预览.png'")
rep("    await testPage.evaluate(() => { window.scopeFlashes = 0;", "    await realUI.locator('#rules').getByRole('button', { name: '调整', exact: true }).first().click();\n    await testPage.evaluate(() => { window.scopeFlashes = 0;")
start = s.index("    await realManager.locator('[data-site=\"other.example\"]').waitFor();")
end = s.index('    await context.close(); context = null;', start)
s = s[:start] + """    await realUI.locator('#saved-toggle').click();
    await realUI.locator('#manage').click();
    await realUI.locator('#all-view').waitFor({ state: 'visible' });
    assert.equal(await realUI.locator('#library').isVisible(), false);
    assert.equal(await realUI.locator('#editor').isVisible(), false);
    const other = realUI.locator('.site-group[data-site="other.example"]');
    await other.locator('summary').click();
    assert.equal(await other.locator('.rule').count(), 1);
    const rename = other.locator('.rule-name input'); await rename.fill('重新命名的图片'); await rename.dispatchEvent('change');
    await other.locator('.rule[aria-label="重新命名的图片"]').waitFor();
    await other.getByRole('checkbox', { name: '全部启用 other.example', exact: true }).uncheck();
    await other.locator('.rule.disabled').waitFor();
    const isolated = await worker.evaluate(() => chrome.storage.local.get(['point-resize:v1:other.example', 'point-resize:v1:127.0.0.1']));
    assert.equal(isolated['point-resize:v1:other.example'].rules[0].enabled, false);
    assert.equal(isolated['point-resize:v1:127.0.0.1'].rules[0].enabled, true);
    await realUI.locator('#site-search').fill('127'); assert.equal(await realUI.locator('.site-group').count(), 1); await realUI.locator('#site-search').fill('');
    const current = realUI.locator('.site-group[data-site="127.0.0.1"]');
    if (!(await current.evaluate(n => n.open))) await current.locator('summary').click();
    await current.locator('.rule-check').uncheck();
    await testPage.waitForFunction(() => getComputedStyle(document.querySelector('[data-demo="image-container"]')).zoom === '1');
    assert.equal(await realUI.locator('#editor').isVisible(), false, 'disabling clears matching active preview');
    await current.locator('.rule-check').check();
    await testPage.waitForFunction(() => getComputedStyle(document.querySelector('[data-demo="image-container"]')).zoom === '0.5');
    await realUI.locator('#site-search').fill('重新命名'); assert.equal(await realUI.locator('.site-group').count(), 1); await realUI.locator('#site-search').fill('');
    if (!(await other.evaluate(n => n.open))) await other.locator('summary').click();
    await testPage.screenshot({ path: path.join(root, 'outputs', '全部网站记录预览.png') });
    await current.getByRole('button', { name: '调整', exact: true }).click(); await realUI.locator('#editor').waitFor({ state: 'visible' });
    assert.equal(await realUI.locator('#number').inputValue(), '50');
    await realUI.locator('#cancel-edit').click();
    await realUI.locator('#manage').click();
    await realUI.locator('#all-back').click();
    assert.equal(await realUI.locator('#library').isVisible(), true);
    assert.equal(await realUI.locator('#editor').isVisible(), false);
    assert.equal(context.pages().length, tabsBefore, 'current/edit/all navigation never opens a management tab');
    await testPage.screenshot({ path: path.join(root, 'outputs', '默认保存列表预览.png') });
    await realUI.locator('#choose').click();
    assert.equal(await realUI.locator('#library').isVisible(), false);
    assert.equal(await realUI.locator('#saved-summary').textContent(), '已保存 1 项');
    await testPage.keyboard.press('Escape');
    assert.equal(await realUI.locator('#library').isVisible(), true);
    check('Inline all-site groups: search website/name, rename, isolated bulk toggle, live individual pause, edit, back; no extra management tab');
    check('Adding collapses existing records immediately; Escape exits picking and returns to website list');
""" + s[end:]
p.write_text(s, encoding='utf-8')
print('Updated test suite for inline library flow')
