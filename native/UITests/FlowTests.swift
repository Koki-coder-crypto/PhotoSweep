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
    private func respondToPhotos(_ labels: [String], app: XCUIApplication) {
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let permissionLabel = NSPredicate(format: "label IN %@", labels)
        let systemAllow = system.buttons.matching(permissionLabel).firstMatch
        let appAllow = app.buttons.matching(permissionLabel).firstMatch
        // OS versions expose the permission sheet under either the app or SpringBoard.
        // Use XCTest's element wait so the OS accessibility snapshot is refreshed.
        // CI can present the privacy sheet late; diagnostics showed the correct
        // button just after the previous 15-second custom predicate timed out.
        let found = systemAllow.waitForExistence(timeout: 30) || appAllow.waitForExistence(timeout: 5)
        if !found {
            capture("photo-permission-failure")
            print("Permission sheet system buttons: \(system.buttons.allElementsBoundByIndex.map(\.label))")
            print("Permission sheet app buttons: \(app.buttons.allElementsBoundByIndex.map(\.label))")
            print("Permission sheet app text: \(app.staticTexts.allElementsBoundByIndex.map(\.label))")
        }
        XCTAssertTrue(found, "System photo permission control must be present")
        (systemAllow.exists ? systemAllow : appAllow).tap()
        XCTAssertTrue(app.staticTexts["Here's where to start."].waitForExistence(timeout: 20))
    }
    private func continueToPhotoPrompt(app: XCUIApplication) {
        XCTAssertTrue(app.staticTexts["Photo access"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Skip"].exists)
        XCTAssertFalse(app.buttons["Back"].exists)
        XCTAssertFalse(app.buttons["Choose photo access"].exists)
        // XCTest also returns controls in the covered home view. Count only
        // actionable controls on the visible permission screen.
        let visible = app.buttons.matching(identifier: "Continue").allElementsBoundByIndex.filter { $0.isHittable }
        XCTAssertEqual(visible.count, 1)
        capture("permission-single-neutral-continue")
        visible.first?.tap()
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
        XCTAssertTrue(app.staticTexts["Photo access"].waitForExistence(timeout: 10))
        app.terminate(); app.launch()
        continueToPhotoPrompt(app: app)
        respondToPhotos(["Don’t Allow", "Don't Allow", "Don't allow", "Don’t allow"], app: app)
        tap("Continue", app: app)
        XCTAssertTrue(app.buttons["Open iPhone settings"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.tabBars.buttons["Organize"].waitForExistence(timeout: 10)); capture("en-04-home")
        app.tabBars.buttons["Swipe"].tap(); capture("en-05-swipe")
        app.tabBars.buttons["To delete"].tap(); XCTAssertTrue(app.staticTexts["No deletion candidates"].waitForExistence(timeout: 10)); capture("en-06-candidates")
        app.terminate(); app.launch()
        XCTAssertTrue(app.tabBars.buttons["Organize"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["Your photos. A little lighter."].exists)
        tap("Settings", app: app)
        let explanation = app.staticTexts["Photo access is turned off. iOS does not show the first permission request again; you can change access in iPhone settings."]
        for _ in 0..<5 where !explanation.isHittable { app.swipeUp() }
        XCTAssertTrue(explanation.exists)
        XCTAssertTrue(app.buttons["permission.settings"].exists)
        XCTAssertFalse(app.buttons["permission.request"].exists)
        XCTAssertFalse(app.buttons["permission.selectPhotos"].exists)
        capture("en-denied-photo-settings")
    }
    func testJapaneseIntroduction() {
        let app = XCUIApplication(); app.launchEnvironment["PHOTOSWEEP_UI_TEST"] = UUID().uuidString
        app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]; app.launch()
        XCTAssertTrue(app.staticTexts["いらない写真を、まとめて整理。"].waitForExistence(timeout: 20)); capture("ja-01-introduction")
        tap("次へ", app: app)
        XCTAssertTrue(app.staticTexts["見比べて、選んでみよう。"].waitForExistence(timeout: 10)); capture("ja-02-compare-practice")
        tap("スキップ", app: app); capture("ja-03-swipe-practice")
        tap("スキップ", app: app)
        XCTAssertTrue(app.staticTexts["写真へのアクセス"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["スキップ"].exists)
        XCTAssertFalse(app.buttons["戻る"].exists)
        XCTAssertEqual(app.buttons.matching(identifier: "次へ").allElementsBoundByIndex.filter { $0.isHittable }.count, 1)
        capture("ja-permission-single-neutral-continue")
    }
    func testPhotoLibrarySortingUndoAndLargeTextResume() {
        let app = XCUIApplication(); app.launchEnvironment["PHOTOSWEEP_UI_TEST"] = UUID().uuidString
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]; app.launch()
        tap("Continue", app: app); tap("Skip", app: app); tap("Skip", app: app)
        continueToPhotoPrompt(app: app)
        respondToPhotos(["Allow Full Access", "Allow Access to All Photos", "Allow All Photos"], app: app)
        let advance = app.buttons.matching(NSPredicate(format: "label IN %@", ["Continue", "Continue while analysis runs"])).firstMatch
        XCTAssertTrue(advance.waitForExistence(timeout: 20)); advance.tap()
        let free = app.buttons["Continue for free"]
        if free.waitForExistence(timeout: 5) { free.tap() }
        let photoCategory = app.buttons["home.category.all"]
        for _ in 0..<8 where !photoCategory.isHittable { app.swipeUp() }
        XCTAssertTrue(photoCategory.waitForExistence(timeout: 10))
        capture("en-home-real-category-thumbnails")
        app.tabBars.buttons["Swipe"].tap(); tap("Start swiping", app: app)
        let keep = app.buttons["swipe.keep"], undo = app.buttons["swipe.undo"], candidate = app.buttons["swipe.candidate"]
        XCTAssertTrue(keep.waitForExistence(timeout: 15)); XCTAssertTrue(keep.isHittable)
        capture("en-07-real-library-swipe")
        // Exercise the reported transition repeatedly against real PhotoKit assets.
        for _ in 0..<30 {
            app.tabBars.buttons["Organize"].tap()
            app.tabBars.buttons["Swipe"].tap()
            XCTAssertTrue(keep.waitForExistence(timeout: 5))
            XCTAssertEqual(app.state, .runningForeground)
        }

        keep.tap()
        XCTAssertTrue(undo.waitForExistence(timeout: 5))
        let enabled = NSPredicate(format: "enabled == true")
        expectation(for: enabled, evaluatedWith: undo); waitForExpectations(timeout: 10)
        undo.tap()
        expectation(for: enabled, evaluatedWith: candidate); waitForExpectations(timeout: 10)
        candidate.tap()
        expectation(for: enabled, evaluatedWith: keep); waitForExpectations(timeout: 10)
        for _ in 0..<50 {
            expectation(for: enabled, evaluatedWith: undo); waitForExpectations(timeout: 10)
            undo.tap()
            expectation(for: enabled, evaluatedWith: candidate); waitForExpectations(timeout: 10)
            candidate.tap()
        }
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
