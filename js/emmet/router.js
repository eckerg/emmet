define(['emmet/notifier'], function(emmetNotifier) {
    /**
     * @typedef {Object} Route
     * @property {string} bookId
     * @property {"main"|"help"|"toc"|"search"|"song"|"proj"} page
     * @property {string=} searchTerm
     * @property {string=} songNumber
     * @property {"lyrics"|"info"|"rec"=} tab
     * @property {string=} lang
     * @property {string=} error
     * @property {string=} requestedPath
     */

    /**
     * @typedef {Object} RouterHandlers
     * @property {string} defaultBookId
     * @property {function(): string} getCurrentBookId
     * @property {function(string): boolean} hasBook
     * @property {function(string, string): boolean} hasSong
     * @property {function(string, string, string): boolean} hasSongLanguage
     * @property {function(string, string): boolean} hasSongRecordings
     * @property {function(string, string): string} getMainSongLanguage
     * @property {function(string): void} setBook
     * @property {function("main"|"help"): void} showPage
     * @property {function(): void} showToc
     * @property {function(string): void} search
     * @property {function(string, "lyrics"|"info"|"rec", string=): void} displaySong
     * @property {function(): void} closeSong
     * @property {function(): void} launchProjection
     * @property {function(): void} closeProjection
     * @property {function(string): void} displayProjectionSong
     * @property {function(): void} clearProjectionSong
     */

    // Errors
    const ERR_UNKNOWN_PATH = "Az Emmet nem ismeri fel ezt az útvonalat.";

    /** @type {RouterHandlers|null} */
    var handlers = null;
    /** @type {Route|null} */
    var currentRoute = null;
    /** @type {string|null} */
    var defaultBookId = null;

    var escapeHtml = function(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
        })[char]);
    };

    // Book IDs use underscores in the data model, but URLs use kebab-case.
    /** @param {string} bookId @returns {string} */
    var bookIdToURL = function(bookId) {
        return bookId.replace(/_/g, "-");
    };

    /** @param {string} bookId @returns {string|null} */
    var bookIdFromURL = function(bookId) {
        return bookId.includes("_") ? null : bookId.replace(/-/g, "_");
    };

    /** @returns {string[]} */
    var pathPartsOfCurrentURL = function() {
        var basePath = new URL(document.baseURI).pathname;
        var path = window.location.pathname;
        if (! path.startsWith(basePath)) {
            throw new Error("The current URL is outside Emmet's base path.");
        }
        path = path.slice(basePath.length);
        return path.split("/").filter(part => part.length > 0).map(decodeURIComponent);
    };

    /** @param {Route} route @returns {string} */
    var makePath = function(route) {
        var parts = [bookIdToURL(route.bookId)];
        if (route.page == "help") {
            parts.push("help");
        } else if (route.page == "toc") {
            parts.push("toc");
        } else if (route.page == "search") {
            parts.push("search", route.searchTerm);
        } else if (route.page == "proj") {
            parts.push("proj");
            if (route.songNumber !== undefined) { parts.push(route.songNumber); }
        } else if (route.page == "song") {
            parts.push(route.songNumber);
            var tab = route.tab || "lyrics";
            var isDefaultLyrics = tab == "lyrics"
                && route.lang == handlers.getMainSongLanguage(route.bookId, route.songNumber);
            if (route.lang !== undefined && ! isDefaultLyrics) {
                parts.push(route.lang);
                parts.push(tab);
            }
        }
        return new URL(parts.map(encodeURIComponent).join("/") + (parts.length ? "/" : ""), document.baseURI).pathname;
    };

    /** @returns {Route} */
    var parseRouteFromCurrentURL = function() {
        var parts;
        try {
            parts = pathPartsOfCurrentURL();
        } catch (e) {
            return {bookId: defaultBookId, page: "main", error: ERR_UNKNOWN_PATH};
        }
        if (parts.length == 0) {
            // Backwards compatibility with the former root-only ?konyv=<bookId> URL.
            var legacyBookId = new URLSearchParams(window.location.search).get("konyv");
            if (legacyBookId !== null && handlers.hasBook(legacyBookId)) {
                return {bookId: legacyBookId, page: "main"};
            }
            return {bookId: defaultBookId, page: "main"};
        }
        if (parts[0] == "help") {
            if (parts.length == 1) { return {bookId: defaultBookId, page: "help"}; }
            return {bookId: defaultBookId, page: "main", error: ERR_UNKNOWN_PATH};
        }
        var requestedBookId = parts.shift();
        var bookId = bookIdFromURL(requestedBookId);
        if (bookId === null || ! handlers.hasBook(bookId)) {
            return {bookId: defaultBookId, page: "main", error: "Nem létezik <strong>"+escapeHtml(requestedBookId)+"</string> azonosítójú énekeskönyv."};
        }
        if (parts.length == 0) { return {bookId: bookId, page: "main"}; }
        var invalidRoute = function(message) {
            return {bookId: bookId, page: "main", error: message};
        };
        var action = parts.shift();
        if (action == "help") {
            return parts.length == 0 ? {bookId: bookId, page: "help"} : invalidRoute(ERR_UNKNOWN_PATH);
        }
        if (action == "toc") {
            return parts.length == 0 ? {bookId: bookId, page: "toc"} : invalidRoute(ERR_UNKNOWN_PATH);
        }
        if (action == "search") {
            return parts.length == 1
                ? {bookId: bookId, page: "search", searchTerm: parts[0]}
                : invalidRoute(ERR_UNKNOWN_PATH);
        }
        if (action == "proj") {
            if (parts.length > 1) { return invalidRoute(ERR_UNKNOWN_PATH); }
            var projRoute = {bookId: bookId, page: "proj"};
            if (parts.length == 1) {
                if (! handlers.hasSong(bookId, parts[0])) {
                    return invalidRoute("<strong>"+escapeHtml(action)+"</strong> számon nem létezik ének ebben az énekeskönyvben.");
                } else {
                    projRoute.songNumber = parts[0];
                }
            }
            return projRoute;
        }
        if (! handlers.hasSong(bookId, action)) {
            return invalidRoute("<strong>"+escapeHtml(action)+"</strong> számon nem létezik ének ebben az énekeskönyvben.");
        }
        var route = {
            bookId: bookId,
            page: "song",
            songNumber: action,
            tab: "lyrics",
            lang: handlers.getMainSongLanguage(bookId, action),
        };
        if (parts.length == 0) { return route; }
        var lang = parts.shift();
        if (! handlers.hasSongLanguage(bookId, action, lang)) {
            route.error = "Az ének nem érhető el <strong>"+escapeHtml(lang)+"</strong> nyelven.";
            return route;
        }
        route.lang = lang;
        if (parts.length == 0) { return route; }
        if (parts.length != 1 || ! ["lyrics", "info", "rec"].includes(parts[0])) {
            return invalidRoute(ERR_UNKNOWN_PATH);
        }
        route.tab = parts[0];
        if (route.tab == "rec" && ! handlers.hasSongRecordings(bookId, action)) {
            route.tab = "lyrics";
            route.error = "Az énekhez nem érhető el felvétel.";
        }
        return route;
    };

    /** @param {Route} route */
    var applyRoute = function(route) {
        currentRoute = route;
        handlers.setBook(route.bookId);
        if (route.page == "main" || route.page == "help") {  // {bookId, page}
            handlers.closeSong();
            handlers.closeProjection();
            handlers.showPage(route.page);
        } else if (route.page == "toc") {  // {bookId, page: "toc"}
            handlers.closeSong();
            handlers.closeProjection();
            handlers.showToc();
        } else if (route.page == "search") {  // {bookId, page: "search", searchTerm}
            handlers.closeSong();
            handlers.closeProjection();
            handlers.search(route.searchTerm);
        } else if (route.page == "song") {  // {bookId, page: "song", songNumber, tab, lang?}
            handlers.closeProjection();
            // A song is an overlay. Deep links do not have a previously rendered
            // page, so render its saved background (or the book's main page) first.
            var background = history.state?.background || {bookId: route.bookId, page: "main"};
            if (background.page == "toc") {
                handlers.showToc();
            } else if (background.page == "search") {
                handlers.search(background.searchTerm);
            } else {
                handlers.showPage(background.page == "help" ? "help" : "main");
            }
            handlers.displaySong(route.songNumber, route.tab, route.lang);
        } else if (route.page == "proj") {  // {bookId, page: "proj", songNumber?}
            handlers.closeSong();
            handlers.launchProjection();
            if (route.songNumber !== undefined) { handlers.displayProjectionSong(route.songNumber); }
            else { handlers.clearProjectionSong(); }
        }
        if (route.error !== undefined) {  // {error, requestedPath}
            emmetNotifier.showError("Ismeretlen útvonal",
                "<p>A következő címet próbáltad megnyitni:<br><code>"+escapeHtml(route.requestedPath)+"</code></p>"+
                "<p>"+route.error+"</p>"
            );
        }
    };

    /**
     * @param {Partial<Route>} route
     * @param {{background?: Route, replace?: boolean, apply?: boolean}} [options]
     */
    var navigate = function(route, options={}) {
        route = Object.assign({}, route);
        if (route.bookId === undefined) {
            route.bookId = handlers.getCurrentBookId();
        }
        var background = options.background;
        if (background === undefined && ["song", "proj"].includes(route.page)) {
            background = currentRoute && !["song", "proj"].includes(currentRoute.page)
                ? currentRoute
                : history.state?.background || {bookId: route.bookId, page: "main"};
        }
        var state = {route: route, background: background};
        history[options.replace ? "replaceState" : "pushState"](state, "", makePath(route));
        if (options.apply !== false) {
            applyRoute(route);
        } else {
            currentRoute = route;
        }
    };

    return {
        /** @param {RouterHandlers} newHandlers */
        configure: function(newHandlers) {
            handlers = newHandlers;
            defaultBookId = newHandlers.defaultBookId;
        },
        init: function() {
            var route = parseRouteFromCurrentURL();
            if (route.error !== undefined) {
                route.requestedPath = window.location.href;
            }
            history.replaceState({route: route, background: null}, "", makePath(route));
            applyRoute(route);
            window.addEventListener("popstate", function(e) {
                var route = e.state?.route || parseRouteFromCurrentURL();
                if (route.error !== undefined) {
                    route.requestedPath = window.location.href;
                    history.replaceState({route: route, background: null}, "", makePath(route));
                }
                applyRoute(route);
            });
        },
        navigate: navigate,
        closeOverlay: function() {
            var state = history.state;
            var background = state?.background || {bookId: currentRoute.bookId, page: "main"};
            navigate(background, {replace: true});
        },
        getCurrentRoute: () => currentRoute,
    };
});
