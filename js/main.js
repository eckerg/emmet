(function() {
    var sriConfig = {
        jquery: 'sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=',
        bootstrap: 'sha256-OUFW7hFO0/r5aEGTQOz9F/aXQOt+TwqI1Z4fbVvww04=',
        mustache: 'sha256-MPgtcamIpCPKRRm1ppJHkvtNBAuE71xcOM+MmQytXi8=',
        jscookie: 'sha256-oE03O+I6Pzff4fiMqwEGHbdfcW7a3GRRxlL+U49L5sA=',
    };
    require.config({
        paths: {
            jquery: [
                'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min',
                'lib/jquery.3.4.1.min'
            ],
            bootstrap: [
                'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.4.1/js/bootstrap.bundle.min',
                'lib/bootstrap.bundle.4.4.1.min'
            ],
            mustache: [
                'https://cdnjs.cloudflare.com/ajax/libs/mustache.js/3.1.0/mustache.min',
                'lib/mustache.3.1.0.min'
            ],
            jscookie: [
                'https://cdnjs.cloudflare.com/ajax/libs/js-cookie/2.2.1/js.cookie.min',
                'lib/js.cookie.2.2.1.min'
            ],
        },
        onNodeCreated: function(node, config, module, path) {
            if (path.startsWith("lib/") || ! (module in sriConfig)) {
                return;
            }
            node.setAttribute('integrity', sriConfig[module]);
            node.setAttribute('crossorigin', 'anonymous');
        },
        waitSeconds: 20,
    });
})();

(function() {
    // Add busts to JS URLs (if available)
    var load = requirejs.load;
    requirejs.load = function (context, moduleId, url) {
        if (url in emmet_busts) {
            url = url.replace(".js", "."+emmet_busts[url]+".js");
        }
        return load(context, moduleId, url);
    };
}());

require(['jquery', 'bootstrap', 'mustache', 'emmet/main', 'emmet/notifier'],
function(j, b, m, emmetMain, emmetNotifier) {
    // All code is loaded.
    
    // Replace pre-load error watcher with the nicer one
    window.removeEventListener("error", emmetPreLoadErrorHandler);
    window.addEventListener("error", function(e) {
        emmetNotifier.showProgramError(e.message, e.filename, e.lineno, e.colno);
    });

    // Bootstrap fix for stacked modals
    $(document).on('show.bs.modal', '.modal', function () {
        var zIndex = 1040 + (10 * $('.modal:visible').length);
        $(this).css('z-index', zIndex);
        setTimeout(function() {
            $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
        }, 0);
    });
    $(document).on('hidden.bs.modal', '.modal', function () {
        $('.modal:visible').length && $(document.body).addClass('modal-open');
    });
    
    // Start to initialize
    emmetMain.init();
});
