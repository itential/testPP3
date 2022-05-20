#!/bin/bash

#-------------------#
# Get Semver Prefix #
#-------------------#
VERSION="$(git log --format=%s --merges -1|awk -F"'" '{print $2}'|awk -F "/" '{print $1}')"
case "$VERSION" in
    # if PATCH transform to patch
    patch|minor|major) SEMVER="$(echo "$VERSION" | awk '{print tolower($0)}')";;
    *) SEMVER="patch";;
esac
if [ -z "$VERSION" ]; then
    echo "No branch prefix detected. Defaulting to patch."
fi

echo "Semver bump: $SEMVER"

#---------------------#
# Get Current Version #
#---------------------#
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Last version: $CURRENT_VERSION"
CURRENT_MAJOR=$(echo "$CURRENT_VERSION"|awk -F'.' '{print $1}')
CURRENT_MINOR=$(echo "$CURRENT_VERSION"|awk -F'.' '{print $2}')
CURRENT_PATCH=$(echo "$CURRENT_VERSION"|awk -F'.' '{print $3}'|awk -F'-' '{print $1}')
CURRENT_PRERELEASE=$(echo "$CURRENT_VERSION"|awk -F'-' '{print $2}')

#---------------------------#
# Version & Release Package #
#---------------------------#

# create release note before versioning the project
sh ./scripts/create_release_script.sh "$NEW_VERSION"

# explicitly add the change log to the version bump commit
git add CHANGELOG.md

echo "Configuring Github credentials"
git config --global user.name '$GITHUB_ACTOR'
git config --global user.email 'github-action@users.noreply.github.com'
git remote set-url origin https://x-access-token:$GITHUB_TOKEN@github.com/$GITHUB_REPOSITORY

echo "Bumping version..."

# bump version, git tag, commit & then push changes
# using -f to ignore the added release note
npm version -f "$SEMVER" -m "Updating $SEMVER version to %s. [skip ci]" --loglevel=error
echo "Version bump successful"

# push to gitlab
# no-verify is used to ignore any pre-push commits that may be used by the project
if git push -f --tags origin "$GITHUB_REF" --follow-tags --no-verify; then
    echo "Version bump pushed successfully."
else
    echo -e "\033[0;31mERROR: ***********************************************************************************"
    echo "ERROR: Failed to push."
    echo -e "ERROR: ***********************************************************************************\033[0m"
    exit 1
fi