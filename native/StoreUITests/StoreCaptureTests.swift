import XCTest
import StoreKitTest

// Separate test bundle. No capture shortcuts, test products, or media enter the app.
final class StoreCaptureTests: XCTestCase {
    private var store: SKTestSession!
    private var ja = false
    private func text(_ en: String, _ jp: String) -> String { ja ? jp : en }
    private func tap(_ label: String, _ app: XCUIApplication) {
        let button = app.buttons[label].firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 30), label)
        for _ in 0..<6 where !button.isHittable { app.swipeUp() }
        button.tap()
    }
    private func capture(_ name: String) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = (ja ? "ja-" : "en-") + name; shot.lifetime = .keepAlways; add(shot)
    }
    private func category(_ key: String, _ app: XCUIApplication) {
        app.tabBars.buttons[text("Organize", "整理")].tap()
        let button = app.buttons["home.category." + key]
        for _ in 0..<8 where !button.isHittable { app.swipeUp() }
        if !button.isHittable { for _ in 0..<8 where !button.isHittable { app.swipeDown() } }
        XCTAssertTrue(button.waitForExistence(timeout: 20)); button.tap()
    }
    func testEnglishStoreScreens() throws { try run(japanese: false) }
    func testJapaneseStoreScreens() throws { try run(japanese: true) }
    private func run(japanese: Bool) throws {
        continueAfterFailure = false; ja = japanese
        store = try SKTestSession(configurationFileNamed: "Capture")
        store.resetToDefaultState(); store.clearTransactions(); store.disableDialogs = true
        store.storefront = "JPN"; store.locale = ja ? Locale(identifier: "ja_JP") : Locale(identifier: "en_US")
        let app = XCUIApplication(); app.terminate()
        app.launchEnvironment["PHOTOSWEEP_UI_TEST"] = UUID().uuidString
        app.launchArguments = ["-AppleLanguages", ja ? "(ja)" : "(en)", "-AppleLocale", ja ? "ja_JP" : "en_US"]
        app.launch()
        tap(text("Continue", "次へ"), app)
        tap(text("Skip", "スキップ"), app); tap(text("Skip", "スキップ"), app)
        // Permission may already be granted by the preceding locale run.
        if app.buttons[text("Skip", "スキップ")].exists { tap(text("Skip", "スキップ"), app) }
        tap(text("Continue", "次へ"), app)
        let free = app.buttons[text("Continue for free", "無料のまま続ける")]
        if free.waitForExistence(timeout: 4) { free.tap() }
        let access = app.buttons[text("Choose photo access", "写真を選ぶ")]
        if access.exists {
            access.tap()
            let names = ["Allow Full Access", "Allow Access to All Photos", "Allow All Photos", "すべての写真へのアクセスを許可", "フルアクセスを許可"]
            let predicate = NSPredicate(format: "label IN %@", names)
            let system = XCUIApplication(bundleIdentifier: "com.apple.springboard").buttons.matching(predicate).firstMatch
            let own = app.buttons.matching(predicate).firstMatch
            XCTAssertTrue(system.waitForExistence(timeout: 30) || own.waitForExistence(timeout: 5))
            (system.exists ? system : own).tap()
        }
        XCTAssertTrue(app.buttons["home.category.videos"].waitForExistence(timeout: 30))
        if app.buttons[text("OK", "わかった")].exists { app.buttons[text("OK", "わかった")].firstMatch.tap() }
        expectation(for: NSPredicate(format: "label CONTAINS '1'"), evaluatedWith: app.buttons["home.category.videos"])
        waitForExpectations(timeout: 30)
        capture("01-organize")
        category("videos", app); capture("04-large-videos")
        app.navigationBars.buttons.firstMatch.tap()
        category("compression", app)
        tap(text("Start compression", "圧縮を開始"), app)
        tap(text("Compress with Pro", "Proで動画を圧縮する"), app)
        let buy = app.buttons[text("Continue with selected plan", "選んだプランで続ける")]
        XCTAssertTrue(buy.waitForExistence(timeout: 30)); capture("review-monthly")
        let lifetime = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", text("Lifetime", "買い切り"))).firstMatch
        XCTAssertTrue(lifetime.waitForExistence(timeout: 10)); lifetime.tap(); capture("review-lifetime")
        tap(text("Continue with selected plan", "選んだプランで続ける"), app)
        XCTAssertTrue(app.buttons[text("Start compression", "圧縮を開始")].waitForExistence(timeout: 30))
        tap(text("Start compression", "圧縮を開始"), app)
        let save = app.buttons[text("Save compressed video", "圧縮動画を保存する")]
        XCTAssertTrue(save.waitForExistence(timeout: 150), "Real compression must produce a smaller output")
        capture("05-compression")
        app.navigationBars.buttons.firstMatch.tap()
        category("duplicate", app)
        let choose = app.buttons[text("Select for deletion", "削除候補に選ぶ")].firstMatch
        XCTAssertTrue(choose.waitForExistence(timeout: 60)); capture("02-comparison")
        choose.tap(); tap(text("Add 1 to candidates", "1件を候補に入れる"), app)
        app.tabBars.buttons[text("Organize", "整理")].tap()
        app.navigationBars.buttons.firstMatch.tap()
        app.tabBars.buttons[text("Swipe", "スワイプ")].tap()
        tap(text("Start swiping", "スワイプで整理する"), app)
        XCTAssertTrue(app.buttons["swipe.keep"].waitForExistence(timeout: 20)); capture("03-monthly-swipe")
        app.tabBars.buttons[text("To delete", "削除候補")].tap(); capture("06-candidates")
        tap(text("Delete 1 items", "1件を削除"), app)
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let delete = system.buttons.matching(NSPredicate(format: "label IN %@", ["Delete", "削除"])).firstMatch
        let ownDelete = app.alerts.buttons.matching(NSPredicate(format: "label IN %@", ["Delete", "削除"])).firstMatch
        XCTAssertTrue(delete.waitForExistence(timeout: 20) || ownDelete.waitForExistence(timeout: 5))
        (delete.exists ? delete : ownDelete).tap()
        XCTAssertTrue(app.staticTexts[text("1 items cleared", "1件を整理しました")].waitForExistence(timeout: 30))
        capture("07-result"); tap(text("Done", "完了"), app)
        app.tabBars.buttons[text("Organize", "整理")].tap()
        app.terminate()
    }
}
