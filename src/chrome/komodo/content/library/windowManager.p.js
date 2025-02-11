/* Copyright (c) 2000-2006 ActiveState Software Inc.
   See the file LICENSE.txt for licensing information. */

if (typeof(ko) == 'undefined') {
    var ko = {};
}
if (!ko.windowManager)
ko.windowManager = {
    fixupOpenDialogArgs: function(inargs) {
        var args = inargs.slice(); // make a copy
        args[2] = ko.windowManager.fixupOpenDialogFeatures(inargs[2]);
        return args;
    },

    /**
     * Return a "fixed-up" version of the "features" argument for
     * window.openDialog(). This tweaks the string on Mac OS X to ensure
     * the dialog is *not* opened as a sheet.
     *
     * @param {String} features The features string to fixup. Pass in
     *      null to get a reasonable default.
     */
    fixupOpenDialogFeatures: function(features /* ="" */) {
        if (typeof(features) == "undefined") features = "";
    
// #if PLATFORM != "win"
        if (!features) {
            features = "chrome,dialog=no";
        } else if (features.indexOf("dialog") < 0) {
// #if PLATFORM == "linux"
            if (features.indexOf("modal") >= 0) {
                // Don't set dialog=no on Linux modal dialogs.
                return features;
            }
// #endif
            features = "dialog=no,"+features;
        }
// #endif
        return features;
    },

    /**
     * Open a window if no windows of windowType exist. Otherwise, bring
     * the window of windowType to the front. Parameters for this function
     * are identical to window.openDialog()
     *
     * @param <String> chromeURL
     * @param <String> windowType
     * @param <String> options
     * @param <*> extra arguments for dialog
     * @return <Window>
     */
    openOrFocusDialog: function openDialogUniqueInstance(chromeURI, windowType) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator);
        var existingWindow = wm.getMostRecentWindow(windowType);
        if (existingWindow) {
            existingWindow.focus();
            return existingWindow;
        }
        var newArgs = new Array();
        for (var i = 0; i < arguments.length; i++) {
          if (i == 1) {
            newArgs[i] = '_blank';
          } else {
            newArgs[i] = arguments[i];
          }
        }
        var win = window.openDialog.apply(window, ko.windowManager.fixupOpenDialogArgs(newArgs));
        
        win.addEventListener("load", function() {
            win.document.documentElement.classList.add("dialog");
        });
        
        return win;
    },

    /**
     * An alternative version of window.openDialog() that does some fixups
     * that Komodo wants in general.
     */
    openDialog: function(/* ... */) {
        // The 'dialog=no' setting is used to allow the launched window/dialog
        // to be hidden behind the main Komodo Window, otherwise it will stay
        // on top.
        if (arguments.length < 2 || !arguments[2]) {
            arguments[2] = "chrome,dialog=no";
        } else if (arguments[2].indexOf("dialog") < 0) {
            arguments[2] = "dialog=no,"+arguments[2];
        }
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i];
        }
        var win = window.openDialog.apply(window, args);
        
        win.addEventListener("load", function() {
            win.document.documentElement.classList.add("dialog");
        });
        
        return win;
    },
    
    /**
     * Open a new window. This is largely the same as openDialog except that it has
     * no biases towards the window being opened being a dialog.
     */
    openWindow: function(/* ... */) {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i];
        }
        return window.openDialog.apply(window, args);
    },

    /**
     * return a reference to the main Komodo window
     *
     * @return <Window>
     */
    getMainWindow: function windowManager_getMainWindow() {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                        .getService(Components.interfaces.nsIWindowMediator);
        var mw = wm.getMostRecentWindow('Komodo');
        
        if (mw && mw.require) // should pretty much always be true
        {
            return mw.require("ko/windows").getMain();
        }
        
        return mw;
    },
    
    /**
     * return true if this is the only Komodo window open
     *
     * @return <Window>
     */
    lastWindow: function() {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator);
        var openWindows = wm.getEnumerator('Komodo');
        openWindows.getNext();
        return !openWindows.hasMoreElements();
    },

    /**
     * Return the last opened window - of any window type.
     *
     * @return <Window>
     */
    getLastAnyWindow: function() {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                    getService(Components.interfaces.nsIWindowMediator);
        var openWindows = wm.getEnumerator(null);
        var lastWindow = openWindows.getNext();
        var currentWindow = lastWindow;
        while (currentWindow) {
            lastWindow = currentWindow;
            currentWindow = openWindows.getNext();
        }
        return lastWindow;
    },

    /**
     * Close all open windows (or just children of a given parent window).
     *
     * The normal goQuitApplication function in toolkit does this, but we want
     * to prevent quitting if one of the dialogs prevents shutdown by not
     * closing.
     *
     * @param {Window} parent An optional argument to only close windows
     *      that are children of this window.
     * @return {Boolean} True if windows were successful closed.
     */
    closeAll: function closeAll(parent /* =null */) {
        if (typeof(parent) == 'undefined') parent = null;

        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator);
        try {
            var openWindows = wm.getEnumerator(null);
            do {
                var openWindow = openWindows.getNext();
                if (openWindow && openWindow != window) {
                    if (parent &&
                        // Skip if isn't a child or it is itself 
                        (parent !== openWindow.parent || parent === openWindow)){
                        continue;
                    }
                    openWindow.close();
                    if (!openWindow.closed) {
                        return false;
                    }
                }
            } while (openWindows.hasMoreElements());
        } catch(e) {
            log.exception(e);
        }
        return true;
    },

    otherWindowHasViewForURI: function(uri) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator);
        try {
            var openWindows = wm.getEnumerator('Komodo');
            do {
                var otherWindow = openWindows.getNext();
                if (otherWindow != window
                    && otherWindow.ko.views.manager.getViewForURI(uri)) {
                    return true;
                }
            } while (openWindows.hasMoreElements());
        } catch(e) {
            log.exception(e);
        }
        return false;
    },
    
    /**
     * Returns an array of all Komodo windows that are currently open.
     * 
     * @returns {array}
     */
    getWindows: function(windowType) {
        if (!windowType) {
            windowType = 'Komodo';
        }
        var windows = [];
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
        .getService(Components.interfaces.nsIWindowMediator);
        // Make sure the mainWindow ends up at the end of the list.
        try {
            var openWindows = wm.getEnumerator(windowType);
            do {
                var openWindow = openWindows.getNext();
                if (openWindow) {
                    windows.push(openWindow);
                }
            } while (openWindows.hasMoreElements());
        } catch(e) {
            log.exception(e);
        }
        return windows;
    },
    
    /**
     * Change the focus to the next Komodo window.
     *
     * @return <Window>
     */
    focusNextWindow: function() {
        var ko_windows = ko.windowManager.getWindows();
        if (ko_windows.length <= 1) {
            return null;
        }
        for (var i=0; i < ko_windows.length; i++) {
            if (ko_windows[i] === window) {
                if (i < (ko_windows.length - 1)) {
                    ko_windows[i+1].focus();
                    return ko_windows[i+1];
                } else {
                    // Focus on the first one then.
                    ko_windows[0].focus();
                    return ko_windows[0];
                }
            }
        }
        return null;
    },

    /**
     * Change the focus to the previous Komodo window.
     *
     * @return <Window>
     */
    focusPreviousWindow: function() {
        var ko_windows = ko.windowManager.getWindows();
        if (ko_windows.length <= 1) {
            return null;
        }
        for (var i=0; i < ko_windows.length; i++) {
            if (ko_windows[i] === window) {
                if (i > 0) {
                    ko_windows[i-1].focus();
                    return ko_windows[i-1];
                } else {
                    // Focus on the last one then.
                    ko_windows[ko_windows.length - 1].focus();
                    return ko_windows[ko_windows.length - 1];
                }
            }
        }
        return null;
    },

    windowFromWindowNum : function(windowNum) {
        var allWindows = ko.windowManager.getWindows();
        for (var thisWin, i = 0; thisWin = allWindows[i]; ++i) {
            if (thisWin._koNum == windowNum) {
                return thisWin;
            }
        }
        return null;
    }
};
