--
-- File generated with SQLiteStudio v3.2.1 on sam. févr. 22 13:09:18 2020
--
-- Text encoding used: UTF-8
--
PRAGMA foreign_keys = off;
BEGIN TRANSACTION;
-- Table: annotations
DROP TABLE IF EXISTS annotations;
CREATE TABLE annotations (
    annotation_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id             REFERENCES documents (document_id) ON DELETE CASCADE
                            NOT NULL,
    character_start INTEGER NOT NULL,
    character_end   INTEGER NOT NULL,
    page_start      INTEGER NOT NULL,
    page_end        INTEGER NOT NULL,
    text            TEXT    NOT NULL,
    top_px          INTEGER NOT NULL,
    left_px         INTEGER NOT NULL,
    topic_id                REFERENCES topics (topic_id) ON DELETE CASCADE
                            NOT NULL
);
-- Table: document_pages
DROP TABLE IF EXISTS document_pages;
CREATE TABLE document_pages (
    document_page_id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id              REFERENCES documents (document_id) ON DELETE CASCADE
                             NOT NULL,
    page             INTEGER NOT NULL,
    height           INTEGER NOT NULL,
    width            INTEGER NOT NULL,
    image            BLOB    NOT NULL,
    image_format     STRING  NOT NULL,
    tokens           BLOB    NOT NULL
);
-- Table: documents
DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
    document_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    pages       INTEGER,
    text        TEXT
);
-- Table: topics
DROP TABLE IF EXISTS topics;
CREATE TABLE topics (
    topic_id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic    TEXT    NOT NULL
                     UNIQUE
);
COMMIT TRANSACTION;
PRAGMA foreign_keys = on;