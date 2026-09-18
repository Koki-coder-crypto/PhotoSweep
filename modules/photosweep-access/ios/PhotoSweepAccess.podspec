Pod::Spec.new do |s|
  s.name = 'PhotoSweepAccess'
  s.version = '1.0.0'
  s.summary = 'PhotoSweep PhotoKit authorization and reconciliation'
  s.description = 'PhotoKit authorization, confirmed deletion, reconciliation and StoreKit purchase availability.'
  s.license = { :type => 'MIT' }
  s.author = 'PhotoSweep'
  s.homepage = 'https://github.com/Koki-coder-crypto/PhotoSweep'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.frameworks = 'Photos', 'StoreKit', 'AVFoundation', 'UIKit'
  s.swift_version = '5.9'
end
