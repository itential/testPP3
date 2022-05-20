git checkout "${GITHUB_REF:11}"
echo "Pulling changes"
git stash
git pull --rebase --tags
git reset --hard origin/"${GITHUB_REF:11}"
cd scripts
GENERATE=`node generate $GITHUB_RUN_ID $GITHUB_REPOSITORY $GITHUB_REF`
cd ..
git add artifact.json
git diff --cached --name-only | if grep artifact.json
then
    echo "A new generated artifact.json file has been checked in to current branch"
    git config --global user.name '$GITHUB_ACTOR'
    git config --global user.email 'github-action@users.noreply.github.com'
    git remote set-url origin https://x-access-token:$GITHUB_TOKEN@github.com/$GITHUB_REPOSITORY
    git add artifact.json
    git commit -am "Automated artifact json generation report [Skip CI]"
    git push
else
    echo "artifact.json file hasn't changed"
fi