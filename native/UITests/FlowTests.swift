import XCTest

final class FlowTests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
        // SQLite isolation does not reset the OS privacy decision between cases.
        let app = XCUIApplication(); app.terminate(); app.resetAuthorizationStatus(for: .photos)
    }
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
    func testPhotoLibrarySortingUndoAndLargeTextResume() {
        let app = XCUIApplication(); app.launchEnvironment["PHOTOSWEEP_UI_TEST"] = UUID().uuidString
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]; app.launch()
        tap("Continue", app: app); tap("Skip", app: app); tap("Skip", app: app)
        tap("Skip", app: app); tap("Continue", app: app)
        tap("Choose photo access", app: app)
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let permissionLabel = NSPredicate(format: "label IN %@", ["Allow Full Access", "Allow Access to All Photos", "Allow All Photos"])
        let systemAllow = system.buttons.matching(permissionLabel).firstMatch
        let appAllow = app.buttons.matching(permissionLabel).firstMatch
        // OS versions expose the permission sheet under either the app or SpringBoard.
        let appeared = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in systemAllow.exists || appAllow.exists }, object: nil)
        let found = XCTWaiter.wait(for: [appeared], timeout: 15) == .completed
        if !found {
            capture("photo-permission-failure")
            print("Permission sheet system buttons: \(system.buttons.allElementsBoundByIndex.map(\.label))")
            print("Permission sheet app buttons: \(app.buttons.allElementsBoundByIndex.map(\.label))")
            print("Permission sheet app text: \(app.staticTexts.allElementsBoundByIndex.map(\.label))")
        }
        XCTAssertTrue(found, "Full photo access permission control must be present")
        (systemAllow.exists ? systemAllow : appAllow).tap()
        app.tabBars.buttons["Swipe"].tap(); tap("Start swiping", app: app)
        let keep = app.buttons["swipe.keep"], undo = app.buttons["swipe.undo"], candidate = app.buttons["swipe.candidate"]
        XCTAssertTrue(keep.waitForExistence(timeout: 15)); XCTAssertTrue(keep.isHittable)
        capture("en-07-real-library-swipe")
        keep.tap()
        XCTAssertTrue(undo.waitForExistence(timeout: 5))
        let enabled = NSPredicate(format: "enabled == true")
        expectation(for: enabled, evaluatedWith: undo); waitForExpectations(timeout: 10)
        undo.tap()
        expectation(for: enabled, evaluatedWith: candidate); waitForExpectations(timeout: 10)
        candidate.tap()
        expectation(for: enabled, evaluatedWith: keep); waitForExpectations(timeout: 10)
        app.swipeUp()
        XCTAssertTrue(app.staticTexts["Today: 29 photos and 5 videos left"].waitForExistence(timeout: 10), "Undo and rejudging must not charge again")
        capture("en-08-real-library-after-rejudge")
        app.terminate()
        app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch(); XCTAssertTrue(app.tabBars.buttons["Swipe"].waitForExistence(timeout: 15)); app.tabBars.buttons["Swipe"].tap()
        XCTAssertTrue(keep.waitForExistence(timeout: 15)); XCTAssertTrue(keep.isHittable); XCTAssertTrue(candidate.isHittable); XCTAssertTrue(undo.isHittable)
        capture("en-09-large-text-resumed-session")
    }
}
