#!/bin/bash

echo StartDeployment;

# Build 
npm install 
npm run build
# ReCreate Branch
git branch -D prod
git checkout -b prod
# Remove all files but public/
shopt -s extglob
rm -rf !(public)
# make public Root
cd public
mv * ..
cd ..
rm public -r
# make a commit 
git add .
git commit -m "Deployment"
# Back to main
git checkout main
# Push if wanted
if [ "$1" == "--push" ];
   echo Pushing
   then git push --all --force
fi

echo Done;