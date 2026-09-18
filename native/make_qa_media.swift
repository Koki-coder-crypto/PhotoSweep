// Original procedural QA media. No private photos or third-party artwork.
// Used only to exercise PhotoKit in CI, never included in the shipping app.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let folder = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
for index in 0..<8 {
    let width = 900, height = 1200
    let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
                            bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.setFillColor(CGColor(red: 0.14 + Double(index) * 0.025, green: 0.55, blue: 0.88, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.setFillColor(CGColor(red: 1, green: 0.83, blue: 0.35, alpha: 1))
    context.fillEllipse(in: CGRect(x: 480 - index * 15, y: 790, width: 180, height: 180))
    context.setFillColor(CGColor(red: 0.12, green: 0.38, blue: 0.37, alpha: 1))
    context.move(to: .zero); context.addLine(to: CGPoint(x: 360, y: 760 - index * 24))
    context.addLine(to: CGPoint(x: 900, y: 0)); context.closePath(); context.fillPath()
    let url = folder.appendingPathComponent("landscape-\(index).png")
    let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, context.makeImage()!, nil)
    precondition(CGImageDestinationFinalize(destination))
}
