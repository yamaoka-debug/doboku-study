"""Optional browser smoke test: python3 tests/mobile-smoke.py (Playwright + Chromium)."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/dist/'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium')
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='networkidle');page.locator('.choice').first.wait_for()
        assert page.locator('#total').inner_text()=='879'
        assert page.locator('#pdf-view').is_hidden()
        assert page.locator('#pdf-view').get_attribute('src') is None
        assert 'dobokujira.com' in page.locator('#pdf-link').get_attribute('href')
        manifest=page.evaluate("fetch('./manifest.webmanifest').then(r=>r.json())")
        assert manifest['start_url']=='./' and manifest['scope']=='./'
        for icon in manifest['icons']:
            assert page.request.get(url+icon['src']).ok
        page.locator('.choice').nth(2).tap();page.locator('#check').tap()
        assert '正解です' in page.locator('#result').inner_text()
        page.locator('#next').tap();assert page.locator('#position').inner_text()=='2 / 879'
        page.click('#toggle-pdf');assert page.locator('#pdf-view').get_attribute('src')
        page.click('#toggle-pdf');assert page.locator('#pdf-view').is_hidden()
        scope=page.evaluate('navigator.serviceWorker.ready.then(r=>r.scope)');assert scope==url
        page.reload(wait_until='networkidle');assert page.evaluate('!!navigator.serviceWorker.controller')
        context.set_offline(True);page.reload(wait_until='networkidle');page.locator('.choice').first.wait_for()
        assert page.locator('#total').inner_text()=='879'
        assert page.locator('#attempts').inner_text()=='1'
        # Chromium's set_offline preserves navigator.onLine with a service worker;
        # emulate the browser's actual offline event separately to verify messaging.
        page.evaluate("Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});dispatchEvent(new Event('offline'))")
        assert 'オフライン' in page.locator('#connection-status').inner_text()
        page.locator('.choice').nth(0).tap();page.locator('#check').tap()
        assert page.locator('#attempts').inner_text()=='2'
        for width in [320,375,390,430]:
            page.set_viewport_size({'width':width,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            assert page.locator('#next').bounding_box()['height']>=44
        assert not errors,errors
        browser.close()
    print('PASS: touch grading, PDF toggle, 320–430px layouts, icons, subpath scope, offline restart/history, offline messaging.')
finally:
    server.shutdown();server.server_close()
