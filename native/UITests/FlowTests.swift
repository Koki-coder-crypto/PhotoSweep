import XCTest

final class FlowTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    private func tap(_ label: String, app: XCUIApplication) {
        let button = app.buttons[label].firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 10), label)
        for _ in 0..<4 where !button.isHittable { app.swipeUp() }
        button.tap()
    }
    func testEnglishIntroductionAndTabs() {
        let app = XCUIApplication(); app.launchEnvironment["PHOTOSWEEP_UI_TEST"] = UUID().uuidString
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]; app.launch()
        XCTAssertTrue(app.staticTexts["Your photos. A little lighter."].waitForExistence(timeout: 20)); capture("en-01-introduction")
        tap("Continue", app: app)
        XCTAssertTrue(app.staticTexts["Compare. Choose the keepers."].waitForExistence(timeout: 10)); capture("en-02-compare-practice")
        tap("Skip", app: app)
        XCTAssertTrue(app.staticTexts["One photo. One decision."].waitForExistence(timeout: 10)); capture("en-03-swipe-practice")
        tap("Skip", app: app)
        tap("Skip", app: app)
        tap("Continue", app: app)
        XCTAssertTrue(app.tabBars.buttons["Organize"].waitForExistence(timeout: 10)); capture("en-04-home")
        app.tabBars.buttons["Swipe"].tap(); capture("en-05-swipe")
        app.tabBars.buttons["To delete"].tap(); XCTAssertTrue(app.staticTexts["No deletion candidates"].waitForExistence(timeout: 10)); capture("en-06-candidates")
        app.terminate(); app.launch()
        XCTAssertTrue(app.tabBars.buttons["Organize"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["Your photos. A little lighter."].exists)
    }
    func testJapaneseIntroduction() {
        let app = XCUIApplication(); app.launchEnvironment["PHOTOSWEEP_UI_TEST"] = UUID().uuidString
        app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]; app.launch()
        XCTAssertTrue(app.staticTexts["いらない写真を、まとめて整理。"].waitForExistence(timeout: 20)); capture("ja-01-introduction")
        tap("次へ", app: app)
        XCTAssertTrue(app.staticTexts["見比べて、選んでみよう。"].waitForExistence(timeout: 10)); capture("ja-02-compare-practice")
        tap("スキップ", app: app); capture("ja-03-swipe-practice")
    }
}
