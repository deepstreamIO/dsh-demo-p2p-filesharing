webpack
rm -rf dist
mkdir dist
mkdir dist/js
cp js/bundle.js dist/js/bundle.js
cp -r css dist/css
cp -r img dist/img
cp index.html dist/index.html
echo "build sucessful!"