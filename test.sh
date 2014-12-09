#!/bin/sh
prj='user'
docker run -it --rm  --name mondis-node --link $prj-mongo:$prj-mongo --link $prj-redis:$prj-redis -v "$(pwd)":/usr/src/app -v /var/log:/var/log -w /usr/src/app node:0.10.31 npm test
