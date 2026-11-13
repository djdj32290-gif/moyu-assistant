from pathlib import Path
p=Path(__file__).resolve().parent / 'tests' / 'verify.cjs'
s=p.read_text(encoding='utf-8')
s=s.replace("    await page.reload();\n    await ui.locator('#panel').waitFor({ state: 'visible' });", "    const managerPromise = context.waitForEvent('page'); await ui.locator('#manage').click(); const manager = await managerPromise; await manager.waitForLoadState();\n    assert.equal(await ui.locator('#rules').count(), 0, 'saved items are outside the settings panel');\n    await page.reload();\n    await ui.locator('#panel').waitFor({ state: 'visible' });", 1)
s=s.replace("assert.match(await ui.locator('#rules').textContent(), /首页图片/);", "assert.equal(await manager.locator('.rule-name input').first().inputValue(), '首页图片');")
s=s.replace("ui.locator('#enabled')", "manager.locator('#enabled')")
s=s.replace("ui.locator('.rule')", "manager.locator('.rule')")
for name in ['层级测试','文字测试']:
    s=s.replace("manager.locator('.rule').filter({ hasText: '"+name+"' })", "manager.locator('.rule[aria-label=\""+name+"\"]')")
s=s.replace("    const savedThumb = realUI.locator('.rule-thumb').first();", "    const realManagerPromise = context.waitForEvent('page'); await realUI.locator('#manage').click(); const realManager = await realManagerPromise; await realManager.waitForLoadState();\n    const savedThumb = realManager.locator('.rule-thumb').first();")
s=s.replace("      const result = { width: bitmap.width, height: bitmap.height, colors };", "      const pixels = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data; let red = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 180 && pixels[i + 1] < 110 && pixels[i + 2] < 130) red++;\n      const result = { width: bitmap.width, height: bitmap.height, colors, red };")
s=s.replace("    assert.ok(imageInfo.colors.every(([r, g, b]) => !(r > 210 && g < 100 && b < 120)), 'thumbnail must exclude the selection outline');", "    assert.ok(imageInfo.red > 100, 'larger context screenshot contains an embedded red target frame');")
start=s.index('    await savedThumb.dblclick();')
end=s.index('    await testPage.reload();',start)
s=s[:start]+'''    await savedThumb.dblclick();
    assert.equal(await realManager.locator('#preview-image').getAttribute('src'), thumbnail);
    assert.equal(await realManager.locator('#preview').isVisible(), true);
    const previewBox = await realManager.locator('#preview-image').boundingBox(); assert.ok(previewBox.width > 176 && previewBox.height > 118);
    assert.ok(Math.abs(previewBox.x + previewBox.width / 2 - 720) < 2, 'screenshot is horizontally centered');
    await realManager.screenshot({ path: path.join(root, 'outputs', '截图放大预览.png') });
    await realManager.keyboard.press('Escape'); assert.equal(await realManager.locator('#preview').isVisible(), false);
    await realManager.locator('.thumb-button').first().focus(); await realManager.keyboard.press('Enter');
    await realManager.getByRole('button', { name: '关闭截图预览' }).click();
    check('Independent manager: larger centered context screenshot has an embedded red frame; double-click, Enter, Escape and close work');
    await realManager.screenshot({ path: path.join(root, 'outputs', '保存管理页预览.png') });
    await testPage.bringToFront();
    await testPage.evaluate(() => { window.scopeFlashes = 0; const host = document.getElementById('point-resize-ui'); new MutationObserver(records => { if (records.some(r => r.target === host) && host.style.visibility === 'hidden') window.scopeFlashes++; }).observe(host, { attributes: true, attributeFilter: ['style'] }); });
    await realUI.locator('#scope-up').click(); await realUI.locator('#scope-down').click(); await testPage.waitForTimeout(200);
    assert.equal(await testPage.evaluate(() => window.scopeFlashes), 0, 'scope switching crops cached snapshot and never hides UI');
    check('Scope switching reuses the original screenshot without hiding the panel or red frame');
''' + s[end:]
s=s.replace("realUI.locator('.rule-thumb')", "realManager.locator('.rule-thumb')")
s=s.replace("await realUI.locator('#rules .textbutton').first().click();", "await realManager.getByRole('button', { name: '调整', exact: true }).first().click(); await realUI.locator('#editor').waitFor({ state: 'visible' });")
start=s.index("        await realManager.locator('.rule-thumb').first().dblclick();")
end=s.index("        await testPage.screenshot",start)
s=s[:start]+s[end:]
s=s.replace("dragging and preview work", "dragging and red frame alignment work")
s=s.replace("    check('Slider supports keyboard increments as well as pointer dragging');", '''    check('Slider supports keyboard increments as well as pointer dragging');
    await ui.locator('#number').fill('73'); await ui.locator('#number').dispatchEvent('change');
    assert.equal(await ui.locator('#round-down').textContent(), '70%'); assert.equal(await ui.locator('#round-up').textContent(), '75%');
    await ui.locator('#round-down').click(); assert.equal(await ui.locator('#number').inputValue(), '70');
    await ui.locator('#round-up').click(); assert.equal(await ui.locator('#number').inputValue(), '75');
    await ui.locator('#number').fill('51'); await ui.locator('#number').dispatchEvent('change');
    const railAtSlider = await ui.locator('#level-rail').boundingBox(), sliderAtRail = await ui.locator('#range').boundingBox();
    assert.ok(Math.abs(railAtSlider.y - (sliderAtRail.y - 12)) < 2, 'layer rail aligned beside slider');
    check('Dynamic rounding shortcuts: 73% offers 70% and 75%, clickable; rail lowered beside slider');''')
p.write_text(s,encoding='utf-8')
