# VossFit Gym exercise catalogue

317 variants/activities; 596 motifs in 24 cropped WebP atlases (~4.3 MB).

Source: user's VossFit-Galerie-24-Raster.zip, Drive file 1FTQnmJotHho2Lr1F5B0oUiECUQ3jFkeS.
Source CSV ends at 549. Entries 550–596 are reconstructed from visible image captions,
not asserted to be recovered original filenames. Per-frame provenance: mapping.csv.
All artwork remains a draft, including previously revised sheets. Known source issues
are retained in source-notes.txt and disclosed in each exercise detail view. Cropping
removes grid captions; it does not correct anatomy or movement phases. General movement
tips do not certify the images.

The picker, planner, details, free training, logs and progression share catalog.js.
Each variant has a stable vf-… ID. New histories use catalog:<exerciseId>; legacy
name-keyed history is preserved. Only exact, unique canonical names are migrated
automatically. Ambiguous existing names show an explicit variant mapping action.
Mapping preserves current training values; swapping resets load/completion, retains
repetitions/rest and removes the old superset link. Favorites and recent selections
are stored per profile and follow the existing cloud sync/export path.
Cardio records minutes and optional kilometres and does not receive weight progression.

Tiles: 250×230 in 5×5 atlases; CSS background-size 500% 500% selects one cropped motif.
Atlases load on demand and are cached for offline reuse after being viewed. Update the
service-worker cache version when replacing art at the same URL.

Regenerate: python scripts/build-exercise-catalog.py /path/to/source.zip (Pillow required).
Test: NODE_PATH=<node_modules> VF_TEST_BROWSER=<optional Chromium path> node tests/gym-library.test.cjs.
Tests use synthetic profiles, block external calls and verify persistence, mapping,
alternatives, source coverage, old-data preservation, cardio, history and mobile layout.
