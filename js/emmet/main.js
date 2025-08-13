define(['bootstrap', 'mustache', 'emmet/config', 'emmet/loader', 'emmet/projector', 'emmet/search', 'emmet/searchdialog', 'emmet/songdata', 'emmet/songdisplay', 'emmet/toc', 'emmet/utils'],
function(bootstrap, mustache, emmetConfig, emmetLoader, emmetProjector, emmetSearch, emmetSearchDialog, emmetSongData, emmetSongDisp, emmetToc, emmetUtils) {
    const CONFIG_LAST_SEEN_SOFTWARE_VERSION = "last-seen-software-version";
    emmetConfig.configureSettings({
        [CONFIG_LAST_SEEN_SOFTWARE_VERSION]: null,
    });
    
    var collapseNavBar = function() {
        var expandedNavbar = document.querySelector(".navbar-collapse.show");
        if (expandedNavbar != null) {
            bootstrap.Collapse.getOrCreateInstance(expandedNavbar).hide();
        }
    };
    var hideMainDropdown = function() {
        bootstrap.Dropdown.getOrCreateInstance("#emmetNavMainDropdown").toggle();
    };
    var hideBookDropdown = function() {
        bootstrap.Dropdown.getOrCreateInstance("#emmetNavBookDropdown").toggle();
    };
    
    var search = function(searchElem) {
        emmetSearch.search(searchElem.val(), "simple", "wholeWord");
        $(searchElem).val("");
        collapseNavBar();
    };

    var searchAdvanced = function(searchElem) {
        emmetSearchDialog.displayAdvancedSearch(searchElem.val());
        $(searchElem).val("");
        collapseNavBar();
    };

    var loadChangelog = function() {
        $.ajax({
            url: "changelog.json",
            dataType: "json",
            success: data => populateChangelog(data),
            error: (jqXHR, textStatus, errorThrown) => {
                document.getElementById("emmet-software-version").innerHTML =
                    '<span class="oi oi-question-mark"></span>';
                document.getElementById("emmet-latest-changes").innerHTML = `
                    <div class="alert alert-danger">
                        <p class="mt-0 fw-bold">Nem sikerült betölteni a változások listáját.</p>
                        <p class="font-monospace">
                            HTTP status: ${jqXHR.status} ${jqXHR.statusText}<br>
                            Description: ${textStatus}
                        </p>
                    </div>
                `;
            },
        });
    };
    var populateChangelog = function(data) {
        // Enrich objects
        data.forEach(version => {
            if (version.date[version.date.length-1] === ".") {
                version.dateWithoutTrailingDot = version.date.slice(0, -1);
            } else {
                version.dateWithoutTrailingDot = version.date;
            }
            var minorVersion = version.version.split(".")[1];
            version.isMajor = (minorVersion == "0");
        });
        
        document.getElementById("emmet-software-version").innerText = data[0].date;
        displayUpdateNotification(data);
        displayChangelog(data);
        emmetConfig.set(CONFIG_LAST_SEEN_SOFTWARE_VERSION, data[0].version);
    };
    var displayUpdateNotification = function(data) {
        var currentVersion = data[0].version;
        var lastSeenVersion = emmetConfig.get(CONFIG_LAST_SEEN_SOFTWARE_VERSION);
        if (lastSeenVersion === null) {
            if (emmetConfig.cookieExists()) {
                lastSeenVersion = "7.1";  // Last version before change notifications
            } else {
                return;  // No settings saved => probably new user
            }
        }
        if (currentVersion == lastSeenVersion) {
            return;
        }
        var newVersions = [];
        for (const vObj of data) {
            if (vObj.version == lastSeenVersion) {
                break;
            }
            newVersions.push(vObj);
        }
        document.getElementById("emmet-change-notification-content").innerHTML =
            mustache.render(emmetUtils.getTemplate("changelog-flat"), {
                "versions": newVersions,
            });
        document.getElementById("emmet-change-notification").classList.remove("d-none");
    };
    var displayChangelog = function(data) {
        var currentVersion = data[0].version;
        var currentMajor = currentVersion.split(".")[0];
        var currentMajorVersions = [];
        var previousVersions = [];
        data.forEach(version => {
            var major = version.version.split(".")[0];
            if (major == currentMajor) {
                currentMajorVersions.push(version);
            } else {
                previousVersions.push(version);
            }
        });
        document.getElementById("emmet-latest-changes").innerHTML =
            mustache.render(emmetUtils.getTemplate("changelog"), {
                "currentMajorVersions": currentMajorVersions,
                "previousVersions": previousVersions,
            });
    }
    
    var init = function() {
        // Load from server
        emmetLoader.loadSongs(onSongsLoaded);
        loadChangelog();
        
        var cookieModal = new bootstrap.Modal("#emmet-cookie-modal");

        // Set up navbar
        $("#emmet-nav-mainlink").click(function(e) {
            e.preventDefault();
            emmetUtils.showPage("main");
            collapseNavBar();
        });
        $("#emmet-navdd-mainlink").click(function(e) {
            e.preventDefault();
            emmetUtils.showPage("main");
            hideMainDropdown();
        });
        $("#emmet-navdd-helplink").click(function(e) {
            e.preventDefault();
            emmetUtils.showPage("help");
            hideMainDropdown();
        });
        $("#emmet-navdd-cookielink").click(function(e) {
            e.preventDefault();
            cookieModal.show();
            hideMainDropdown();
        })
        $("#emmet-toc-link").click(function(e) {
            e.preventDefault();
            emmetToc.show();
            hideBookDropdown();
            collapseNavBar();
        });

        // Set up pages

        // General
        $("body").on("click", ".emmet-home-link", function(e) {
            e.preventDefault();
            emmetUtils.showPage("main");
        });
        // Main
        $(".emmet-p-main-toc-btn").click(function(e) {
            e.preventDefault();
            emmetToc.show();
        });
        $(".emmet-jumpto-songno").on("input blur", function(e) {
            var tooltip = bootstrap.Tooltip.getInstance(this);
            if (tooltip != null) { tooltip.dispose(); }
        });
        $(".emmet-form-jumpto").submit(function(e) {
            e.preventDefault();
            var songNoField = $(this).find(".emmet-jumpto-songno");
            try {
                emmetSongDisp.displaySong(songNoField.val());
            } catch (exc) {
                var message = `<span class="text-warning"><span class="oi oi-circle-x"></span> ${exc.message}</span>`;
                songNoField.attr("data-bs-title", message);
                var tooltip = new bootstrap.Tooltip(songNoField, {placement: "bottom", trigger: "manual", html: true})
                tooltip.update();
                tooltip.show();
                return;
            }
            songNoField.val("");
            collapseNavBar();
        })
        $(".emmet-form-search").submit(function(e) {
            e.preventDefault();
            search($(this).find(".emmet-search-expr"));
        });
        $(".emmet-search-simple").click(function() {
            search($(this).parents(".input-group").children(".emmet-search-expr"));
        });
        $(".emmet-search-advanced").click(function() {
            searchAdvanced($(this).parents(".input-group").children(".emmet-search-expr"));
        });
        $(".emmet-p-main-proj-btn").click(function(e) {
            e.preventDefault();
            emmetProjector.launch();
        })
        
        // Show main page by default
        emmetUtils.showPage("main");

        // Cookie consent
        document.getElementById("emmet-cookie-modal").addEventListener("hidden.bs.modal", () => {
            document.querySelectorAll("#emmet-cookie-accordion .collapse").forEach(it => {
                bootstrap.Collapse.getOrCreateInstance(it).hide();
            });
        });
        document.getElementById("emmet-cookie-grant-btn").addEventListener("click", () => {
            emmetConfig.grantConsent();
            cookieModal.hide();
        });
        document.getElementById("emmet-cookie-withdraw-btn").addEventListener("click", () => {
            emmetConfig.withdrawConsent();
            cookieModal.hide();
        });
        if (emmetConfig.hasConsented() === undefined) {
            cookieModal.show();
        }
    };
    
    var onSongsLoaded = function(data) {
        emmetSongData.setData(data);
        updateBookList();
        document.getElementById("emmet-songs-version").innerText = data.version;
        $("#emmet-loading").fadeOut();
    };

    var setBook = function(newBookId) {
        emmetSongData.setBook(newBookId);
        updateBookList();
        emmetUtils.showPage("main");
    };
    
    var updateBookList = function() {
        // Select non-opened books
        var otherBooks = [];
        emmetSongData.getBookList().forEach(function(book) {
            if (book.id == emmetSongData.getCurrentBookId()) {return;}
            if (! book.selectable) {return;}
            otherBooks.push(book);
        });
        otherBooks.sort(function(a,b) {
            if (a.name < b.name) {return -1};
            if (a.name > b.name) {return 1};
            return 0;
        });
        
        // Populate dropdown
        var bookListHtml = mustache.render(emmetUtils.getTemplate("booklist"), otherBooks);
        $("#emmet-nav-bookselector").html(bookListHtml);
        $("#emmet-nav-bookselector .dropdown-item:not(.disabled)").click(function() {
            setBook($(this).data("bookid"));
            hideBookDropdown();
            return false;
        });
        
        // Change label of button
        $("#emmetNavBookDropdown > span.emmet-book-name").text(emmetSongData.getCurrentBook().name);
    };
    
    return {
        init: init,
    };
});
