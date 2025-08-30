define(['bootstrap', 'mustache', 'emmet/config', 'emmet/songdata', 'emmet/utils'],
function(bootstrap, mustache, emmetConfig, emmetSongData, emmetUtils) {
    const CONFIG_FONTSIZE = "proj-font-size";
    emmetConfig.configureSettings({
        [CONFIG_FONTSIZE]: "100",
    });

    var openOverlay = function() {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.getElementById("emmet-projector").style.display = "flex";
        document.body.style.overflow = "hidden";
    };
    var closeOverlay = function() {
        document.getElementById("emmet-projector").style.display = "none";
        document.body.style.overflow = "";
        bootstrap.Popover.getInstance(document.getElementById("emmet-proj-fontsize-btn"))?.hide();
    };

    var formatToolbarCorners = function() {
        var toolbarButtons = Array.from(document.querySelectorAll("#emmet-projector .toolbar-end button"));
        toolbarButtons.forEach(it =>
            it.classList.remove("rounded-start", "rounded-end")
        );
        toolbarButtons.some(it => {
            if (it.classList.contains("d-none")) { return false; }
            it.classList.add("rounded-start");
            return true;
        });
        toolbarButtons.slice().reverse().some(it => {
            if (it.classList.contains("d-none")) { return false; }
            it.classList.add("rounded-end");
            return true;
        });
    };
    var switchToInner = function() {
        document.querySelectorAll("#emmet-projector .emmet-proj-only-inner")
            .forEach(it => it.classList.remove("d-none"));
        document.querySelectorAll("#emmet-projector .emmet-proj-only-outer")
            .forEach(it => it.classList.add("d-none"));
        formatToolbarCorners();
    };
    var switchToOuter = function() {
        document.querySelectorAll("#emmet-projector .emmet-proj-only-inner")
            .forEach(it => it.classList.add("d-none"));
        document.querySelectorAll("#emmet-projector .emmet-proj-only-outer")
            .forEach(it => it.classList.remove("d-none"));
        formatToolbarCorners();
        bootstrap.Popover.getInstance(document.getElementById("emmet-proj-fontsize-btn"))?.hide();
    };
    switchToOuter();

    var toggleFullScreen = function() {
        if (!document.fullscreenElement) {
            document.body.requestFullscreen();
            updateFullScreenIcon(true);
        } else {
            document.exitFullscreen?.();
            updateFullScreenIcon(false);
        }
        bootstrap.Tooltip.getInstance(document.getElementById("emmet-proj-fullscreen-btn")).hide();
    };
    var updateFullScreenIcon = function(isFullScreen) {
        if (isFullScreen === undefined) {
            isFullScreen = document.fullscreenElement;
        }
        var classes = document.querySelector("#emmet-proj-fullscreen-btn span").classList;
        if (isFullScreen) {
            classes.remove("oi-fullscreen-enter");
            classes.add("oi-fullscreen-exit");
        } else {
            classes.remove("oi-fullscreen-exit");
            classes.add("oi-fullscreen-enter");
        }
    };

    var updateFontSizeFromConfig = function() {
        document.getElementById("emmet-proj-lyrics").style.fontSize =
            emmetConfig.get(CONFIG_FONTSIZE) + "%";
    };

    var openSong = function(songNum) {
        var song = emmetSongData.getSongFromCurrentBook(songNum);
        var mainLang = emmetSongData.getMainLangOfSong(song);
        var verses = emmetSongData.getVersesInDefinedOrder(mainLang);
        if (verses.length == 1 && !verses[0].isChorus) {
            var verse = Object.assign({}, verses[0]);
            verse.hideDisplayName = true;
            verses = [verse];
        }

        var lyricsHtml = mustache.render(emmetUtils.getTemplate("songlyrics"), {
            'verses': verses,
        });
        document.getElementById("emmet-proj-lyrics").innerHTML = lyricsHtml;

        var navHtml = mustache.render(emmetUtils.getTemplate("projnav"), {
            "verses": verses,
        });
        
        document.getElementById("emmet-proj-verse-ctrl-content").innerHTML = navHtml;

        switchToInner();
        document.getElementById("emmet-proj-verse-ctrl").scrollTo(0, 0);
        updateToolbarScrollShadows();

        // For scrollspy to work correctly
        var containerDiv = document.getElementById("emmet-proj-main-inner");
        containerDiv.scrollTo(0, 0);
        containerDiv.style.height = (containerDiv.scrollHeight + window.innerHeight) + "px";
        new bootstrap.ScrollSpy(containerDiv, {
            target: "#emmet-proj-verse-ctrl",
            smoothScroll: true,
            rootMargin: "-10% 0px -90% 0px",
            threshold: [0],
        });
    };

    // Add scroll shadows to toolbar
    var ctrlToolbarContent = document.getElementById("emmet-proj-verse-ctrl-content");
    var ctrlShadowBefore = document.querySelector("#emmet-proj-verse-ctrl .emmet-shadow-before");
    var ctrlShadowAfter = document.querySelector("#emmet-proj-verse-ctrl .emmet-shadow-after");
    var updateToolbarScrollShadows = function() {
        ctrlShadowBefore.style.display = ctrlToolbarContent.scrollLeft == 0 ? "none" : "block";
        ctrlShadowAfter.style.display =
            ctrlToolbarContent.scrollLeft + ctrlToolbarContent.clientWidth
                > ctrlToolbarContent.scrollWidth - 10
            ? "none" : "block";
    }
    document.getElementById("emmet-proj-verse-ctrl-content")
        .addEventListener("scroll", () => updateToolbarScrollShadows());

    // Activate tooltips on toolbar buttons
    document.querySelectorAll('#emmet-projector .emmet-proj-toolbar button[data-bs-toggle="tooltip"]')
        .forEach(it => new bootstrap.Tooltip(it, {fallbackPlacements: ["top"]}));

    // Set up font size & its popover
    var fontSizeBtn = document.getElementById("emmet-proj-fontsize-btn");
    var fontSizePopover = new bootstrap.Popover(fontSizeBtn, {
        content: () => `
            <div class="row gx-2 flex-nowrap">
                <div class="col-auto d-flex align-items-center">
                    <input type="range" id="emmet-proj-fontsize-range" class="form-range col-auto w-auto"
                    min="100" max="600" step="50" value="${emmetConfig.get(CONFIG_FONTSIZE)}">
                </div>
                <div class="col-auto d-flex align-items-center">
                    <output for="emmet-proj-fontsize-range" id="emmet-proj-fontsize-range-value"
                        class="d-inline-block">
                        ${emmetConfig.get(CONFIG_FONTSIZE)}%
                    </output>
                </div>
                <div class="col-auto">
                    <button id="emmet-proj-fontsize-close" class="btn btn-secondary btn-sm">
                        <span class="oi oi-x"></span>
                    </button>
                </div>
            </div>
        `,
        customClass: "emmet-proj-fontsize-popover",
        fallbackPlacements: ["top"],
        html: true,
        sanitize: false,
        title: "",
        trigger: "manual",
    });
    var fontSizePopoverDisplayed = false;
    fontSizeBtn.addEventListener("inserted.bs.popover", () => {
        document.getElementById("emmet-proj-fontsize-range").addEventListener("input", function() {
            emmetConfig.set(CONFIG_FONTSIZE, this.value);
            updateFontSizeFromConfig();
            document.getElementById("emmet-proj-fontsize-range-value").textContent = this.value + "%";
        });
        document.getElementById("emmet-proj-fontsize-close").addEventListener("click", () => {
            fontSizePopover.hide();
            fontSizePopoverDisplayed = false;
        });
    });
    updateFontSizeFromConfig();

    // Bind toolbar buttons
    document.getElementById("emmet-proj-jumpto-form").addEventListener("submit", e => {
        e.preventDefault();
        var songNumField = document.getElementById("emmet-proj-jumpto-songno");
        try {
            openSong(songNumField.value);
        } catch (e) {
            songNumField.style.transition = "background-color 0.5s ease";
            songNumField.style.backgroundColor = "var(--bs-danger)";
            setTimeout(() => songNumField.style.backgroundColor = "", 500);
            setTimeout(() => songNumField.style.transition = "", 1000);
            return false;
        }
        songNumField.value = "";
        return false;
    });
    document.getElementById("emmet-proj-idlebg-btn").addEventListener("click", e => {
        var outerMain = document.getElementById("emmet-proj-main-outer");
        var idleBgBtn = document.getElementById("emmet-proj-idlebg-btn");
        if (idleBgBtn.classList.contains("active")) {
            outerMain.classList.remove("emmet-proj-idlebg-emmicon");
            idleBgBtn.classList.remove("active");
        } else {
            outerMain.classList.add("emmet-proj-idlebg-emmicon");
            idleBgBtn.classList.add("active");
        }
    });
    updateFullScreenIcon();
    document.getElementById("emmet-proj-fontsize-btn").addEventListener("click", function() {
        if (fontSizePopoverDisplayed) {
            fontSizePopover.hide();
        } else {
            fontSizePopover.show();
        }
        fontSizePopoverDisplayed = !fontSizePopoverDisplayed;
    });
    document.getElementById("emmet-proj-fullscreen-btn")
        .addEventListener("click", () => toggleFullScreen());
    document.getElementById("emmet-proj-close-btn")
        .addEventListener("click", () => switchToOuter());
    document.getElementById("emmet-proj-exit-btn")
        .addEventListener("click", () => closeOverlay());

    return {
        launch: openOverlay,
    };
});