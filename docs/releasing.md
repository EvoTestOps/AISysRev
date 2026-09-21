# Releasing

A release is a `vX.Y.Z` git tag plus a matching GitHub release. Pushing the tag is what publishes the production images. The GitHub release is the human-readable record of what changed.

## Before you start

- Everything you want to ship is merged to `main`, and CI on `main` is green.
- The change has run on staging. Merging to `main` publishes staging images (`build-staging.yml`), so check staging first.
- Pick the version number. Versions follow `vMAJOR.MINOR.PATCH`, e.g. `v1.1.0`. The tag must match `v*.*.*` or the production workflow won't run. List existing tags with `git tag --sort=-v:refname`.

## Steps

1. **Create the tag** on the latest `main`:

   ```sh
   git checkout main
   git pull
   git tag v1.2.0
   ```

2. **Push the tag:**

   ```sh
   git push --tags
   ```

   This starts [build-prod.yml](../.github/workflows/build-prod.yml), which runs the tests and then pushes the production backend and frontend images, tagged with the version (e.g. `backend-v1.2.0`) and `production`. Follow the run under the repository's **Actions** tab.

3. **Open the releases page:** on GitHub, go to the repository's **Releases** (right sidebar of the repository home page) and click **Draft a new release**.

4. **Choose the tag** you just pushed in the **Choose a tag** dropdown.

5. **Title the release the same as the tag**, e.g. `v1.2.0`.

6. **Generate the release notes:** click **Generate release notes**. GitHub fills the description with the pull requests merged since the previous release. Read through it and edit if needed, for example to add manual upgrade steps.

7. **Publish** with **Publish release**.

## Notes

- Tags can't be quietly changed once others have fetched them, so make sure the commit is the one you want before pushing. If the production workflow fails because of the tests, fix it on `main` and release a new patch version instead of moving the tag.
- Creating a release from the GitHub UI for a tag that doesn't exist yet also creates the tag, but the steps above push the tag first on purpose, so the image build starts before the release is announced.
