# Store capture sample media

Only the disposable simulator library receives these files. They are not bundled in PhotoSweep or copied from the user's Cleanup recording.

- Grand Prismatic Spring, USGS / NGP User Engagement Office, July 2002: https://www.usgs.gov/media/images/grand-prismatic-spring . The source labels it Public Domain. Original: https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/thumbnails/image/P7120006e.jpg
- GrandPrismaticSpring.jpg, Jan Kronsell, 2006: https://commons.wikimedia.org/wiki/File:GrandPrismaticSpring.jpg . Photographer explicitly released the work into the public domain. Original: https://upload.wikimedia.org/wikipedia/commons/9/9f/GrandPrismaticSpring.jpg
- Grand Prismatic Spring video, Yellowstone National Park / National Park Service: https://www.nps.gov/yell/learn/photosmultimedia/vl_grandprismatic.htm . Source explicitly states public domain, 1280×720, 60p, audio. Original: https://www.nps.gov/nps-audiovideo/legacy/yell/7E5FFF00-155D-451F-676262A83E6E19C7/yell-MGBasin00547MTS1_1280x720.mp4

Source declarations inspected 2026-09-21. Duplicate copies are deliberately imported to exercise the actual detector. Counts/sizes/results come from PhotoKit and the app, not a screenshot overlay. Original bytes are downloaded at capture time; no reference-user media is sent to CI.

The separate StoreCapture test bundle uses Apple's local StoreKit testing with the configured monthly/lifetime IDs and Japanese base prices. This supports capture and local purchase-path testing only, and must not be reported as production Sandbox purchase validation. Configuration and sample media never enter the shipping application target.
