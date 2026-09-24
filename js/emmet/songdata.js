define([], function() {
    const DEFAULT_BOOK_ID = "emm_hu";
    var songData = null;
    var currentBook = DEFAULT_BOOK_ID;
    var availableLanguages = null;

    var getMainLangIdOfSong = function(song) {
        var currentBookEntry = song.books.find(b => b.id == currentBook);
        if (currentBookEntry === undefined) {
            return 0;
        }
        return song.lyrics.findIndex(e => e.lang == currentBookEntry.lang);
    };

    var normalizeSongNumber = function(songNumber) {
        return typeof songNumber == "string" ? songNumber.toLowerCase().trim() : "";
    };

    var hasSongInBook = function(songBook, songNumberLc) {
        return songBook !== undefined && songNumberLc !== "" && songBook.songs.hasOwnProperty(songNumberLc);
    };

    var hasSong = function(bookId, songNumber) {
        return hasSongInBook(songData.books[bookId], normalizeSongNumber(songNumber));
    };

    var getSong = function(bookId, songNumber) {
        var songBook = songData.books[bookId];
        if (songBook === undefined) {
            throw {name: "bookMissing", message: "Ismeretlen énekeskönyv!"};
        }
        var songNumberLc = normalizeSongNumber(songNumber);
        if (! songNumberLc) {
            throw {name: "empty", message: "Hiányzó énekszám!"};
        }
        if (! hasSongInBook(songBook, songNumberLc)) {
            throw {name: "missing", message: "Ismeretlen énekszám!"};
        }
        return songBook.songs[songNumberLc];
    };

    return {
        getCurrentBook: function() {
            return songData.books[currentBook];
        },
        getCurrentBookId: function() {
            return currentBook;
        },
        getDefaultBookId: function() {
            return DEFAULT_BOOK_ID;
        },
        getSong: getSong,
        hasSong: hasSong,
        hasSongLanguage: function(bookId, songNumber, lang) {
            if (! hasSong(bookId, songNumber)) {
                return false;
            }
            return getSong(bookId, songNumber).lyrics.some(lyrics => lyrics.lang == lang);
        },
        hasSongRecordings: function(bookId, songNumber) {
            return hasSong(bookId, songNumber) && getSong(bookId, songNumber).records !== undefined;
        },
        getSongFromCurrentBook: function(songNumber) {
            return getSong(currentBook, songNumber);
        },
        getBook: function(bookId) {
            return songData.books[bookId];
        },
        getBookIds: function() {
            return Object.keys(songData.books);
        },
        getBookList: function() {
            return songData.bookList;
        },
        getAllSongs: function() {
            return songData.songs;
        },
        getAvailableLanguages: function() {
            return availableLanguages;
        },
        setBook: function(newBookId) {
            currentBook = newBookId;
        },

        setData: function(data) {
            songData = data;

            var langsAndOccurrances = new Map();
            for (let song of songData.songs) {
                for (let lyrics of song.lyrics) {
                    langsAndOccurrances[lyrics.lang] = (langsAndOccurrances[lyrics.lang] || 0) + 1;
                }
            }
            availableLanguages = Object.keys(langsAndOccurrances).sort((a, b) => langsAndOccurrances[b] - langsAndOccurrances[a]);
        },

        getMainLangIdOfSong: getMainLangIdOfSong,
        getMainLangOfSong: function(song) {
            return song.lyrics[getMainLangIdOfSong(song)];
        },
        getVersesInDefinedOrder: function(lang) {
            return 'order' in lang
                ? lang.order.map((verseName, index) => {
                    var verse = lang.verses.find(v => v.name == verseName);
                    var newVerse = Object.assign({}, verse);
                    newVerse.verseId = index;
                    return newVerse;
                })
                : lang.verses;
        }
    };
})
