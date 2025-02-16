# Changelog

All notable changes to this project will be documented in this file.  
This project adheres to [Semantic Versioning](https://semver.org/).

## [1.2.1] - 2025-02-15

### Fixed
- Now run all Rating Poster requests in parallel. This has greatly improved performance. The things you forget when moving fast.
- Moved RPDB logic to the handler level to be more SOLID.
- Fixed version numbering so we aren't jumping major versions so quickly!

## [1.2.0] - 2025-02-15

This is a breaking change. Users need to reinstall.

### Added
- Rating Poster API now used.

### Changed
- User keys are now URL encoded using base64. NOT ENCRYPTED.

## [1.1.1] - 2025-02-14

### Added
- Trending now on homepage
- Cinemeta is now used as a backup source
- Added ai.filmwhisper.dev
- Added CHANGELOG

### Changed
- Removed west2 location
- Added euro2 and aus1 locations

---

## [1.1.0] - 2025-02-13

This is a breaking change users will have to reinstall.

### Added
- Added TV series

### Changed
- Changed vector structure

---

## [1.0.1] - 2025-02-11

### Added
- Added AI Recommended section to homepage

### Fixed
- Fixed issue with 404 on homepage

---

## [1.0.0] - 2025-02-10

### Added
- Initial release of the project.
- Core functionality currently only does movies.