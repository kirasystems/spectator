db:
	echo "Creating SQLite3 database"
	sqlite3 spectator.db < schema.sql

build:
	cd ../document-viewer/; yarn install; yarn build
	cd web; $(MAKE) link; yarn install; yarn build
	test ! -f "./spectator.db" && $(MAKE) db || true
	echo "Done!"

run:
	go run .