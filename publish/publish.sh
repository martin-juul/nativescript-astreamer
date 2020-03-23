#!/bin/bash

PACK_DIR=package

publish() {
  cd $PACK_DIR || echo "$PACK_DIR does not exist" && exit
  echo 'Publishing to npm...'
  yarn publish ./*.tgz
}

./pack.sh && publish
