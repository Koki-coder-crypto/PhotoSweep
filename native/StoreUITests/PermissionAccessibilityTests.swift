import XCTest

// Runs only in the verification/capture bundle, never in the shipped app.
final class PermissionAccessibilityTests: XCTestCase {
    override func tearDownWithError() throws {
        let app = XCUIApplication()
        if testRun?.failureCount ?? 0 > 0 {
            let evidence = XCTAttachment(string: app.debugDescription)
            evidence.lifetime = .keepAlways; add(evidence)
        }
        app.terminate()
        app.resetAuthorizationStatus(for: .photos)
    }

    func testDeniedPhotoAccessAndAccessibleTabControls() throws {
        continueAfterFailure = false
        let app = XCUIApplication(); app.terminate()
        app.resetAuthorizationStatus(for: .photos)
        app.launchEnvironment["PHOTOSWEEP_UI_TEST"] = UUID().uuidString
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        for label in ["Continue", "Skip", "Skip"] {
            let button = app.buttons[label].firstMatch
            XCTAssertTrue(button.waitForExistence(timeout: 20), label); button.tap()
        }
        XCTAssertTrue(app.staticTexts["Photo access"].waitForExistence(timeout: 20))
        XCTAssertFalse(app.buttons["Skip"].exists)
        XCTAssertFalse(app.buttons["Back"].exists)
        let next = app.buttons["Continue"].firstMatch
        XCTAssertTrue(next.waitForExistence(timeout: 20)); next.tap()
        let labels = NSPredicate(format: "label IN %@", ["Don’t Allow", "Don't Allow", "Don't allow", "Don’t allow"])
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard").buttons.matching(labels).firstMatch
        let own = app.buttons.matching(labels).firstMatch
        XCTAssertTrue(system.waitForExistence(timeout: 30) || own.waitForExistence(timeout: 5))
        (system.exists ? system : own).tap()
        XCTAssertTrue(app.staticTexts["Here's where to start."].waitForExistence(timeout: 20))
        XCTAssertTrue(next.waitForExistence(timeout: 20)); next.tap()
        let access = app.buttons["Open iPhone settings"]
        XCTAssertTrue(access.waitForExistence(timeout: 20))
        for tab in ["Swipe", "To delete", "Organize"] {
            let control = app.tabBars.buttons[tab]
            XCTAssertTrue(control.isHittable); control.tap()
            XCTAssertEqual(app.state, .runningForeground)
            if #available(iOS 17.0, *) {
                try app.performAccessibilityAudit(for: [.sufficientElementDescription, .trait])
            }
        }
        app.terminate(); app.launch()
        XCTAssertTrue(access.waitForExistence(timeout: 20))
        XCTAssertEqual(app.state, .runningForeground)
    }
}
