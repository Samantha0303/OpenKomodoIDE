/* Copyright (c) 2000-2006 ActiveState Software Inc.
   See the file LICENSE.txt for licensing information. */


//Arguments to window.arguments[0] are:
//    Required:
//        item: the item being edited
//        task: 'new' or 'edit'
//        type: the type of the part ('URL', 'template', etc...)
//        src:  the chrome of the image to be used in the dialog

var ko = require("ko/windows").getMain().ko;
var gPriority, gPriorityLabel, gOKButton, gPart, gItem;
var gAccessKey = null;
var tabs, gApplyButton;
var gPartType;
var gObserverSvc;
var partname;

function onLoad() {
    try {
        var dialog = document.getElementById("dialog-custommenuproperties");
        gOKButton = dialog.getButton("accept");
        gApplyButton = dialog.getButton("extra1");
        gApplyButton.setAttribute('label', 'Apply');
        gApplyButton.setAttribute('accesskey', 'a');
        gItem = window.arguments[0].item;
        gPartType = window.arguments[0].type;
        var prettyType = window.arguments[0].prettytype;
        gPart = gItem;
        document.getElementById('propertiestab_icon').setAttribute('src', gPart.iconurl);
        gObserverSvc = Components.classes["@mozilla.org/observer-service;1"].
                  getService(Components.interfaces.nsIObserverService);
        if (window.arguments[0].task == 'new') {
            document.title = "Create New " + prettyType;
            gApplyButton.setAttribute('collapsed', 'true');
        } else {
            document.title = prettyType + " Properties";
        }
        if (gPartType == 'menu') {
            document.getElementById('accessbox').removeAttribute('collapsed');
            gAccessKey = document.getElementById('accesskey');
            gAccessKey.value = gPart.getStringAttribute('accesskey');
        }
        tabs = document.getElementById('tabs');
        partname = document.getElementById('partname');
        partname.value = gPart.getStringAttribute('name');
        gPriority = document.getElementById('priority');
        gPriority.value = String(gPart.getLongAttribute('priority'));
        var tooltip = "A number - the lower it is, the further to the left the " +
            gPartType + " is.";
        gPriority.setAttribute('tooltiptext', tooltip);
        gPriorityLabel = document.getElementById('priority_label');
        gPriorityLabel.setAttribute('tooltiptext', tooltip);

        UpdateField('name', true);
        partname.focus();
        partname.select();
        UpdateOK();
    } catch (e) {
        log.error(e);
    }
};

function OK()  {
    if (_Apply()) {
        window.arguments[0].res = true;
        window.close();
    }
};

function Apply() {
    _Apply();
    gApplyButton.setAttribute('disabled', 'true');
    return false;
}

function _Apply()  {
    try {
        gPart.setLongAttribute('priority', Number(gPriority.value));
        if (gAccessKey) {
            switch (gAccessKey.value.toLowerCase()) {
                case 'f':
                case 'e':
                case 'v':
                case 'd':
                case 'p':
                case 'o':
                case 't':
                case 'w':
                case 'h':
                    alert("The access key '" + gAccessKey.value +
                          "' is reserved by Komodo for its core menus.  Please choose another.");
                    return false;
            }
            gPart.setStringAttribute('accesskey', gAccessKey.value);
        }
        gItem.name = partname.value;
        if (gPartType == 'menu') {
            gObserverSvc.notifyObservers(gPart, 'menu_changed', 'part changed')
        } else {
            gObserverSvc.notifyObservers(gPart, 'toolbar_changed', 'part changed')
        }
        gPart.setStringAttribute('name', partname.value);
        gItem.save();
    } catch (e) {
        log.exception(e);
    }
    return true;
};

function UpdateOK() {
    if (partname.value == '' || gPriority.value== '') {
        gOKButton.setAttribute('disabled', 'true');
        gApplyButton.setAttribute('disabled', 'true');
    } else {
        if (gOKButton.hasAttribute('disabled')) {
            gOKButton.removeAttribute('disabled');
        }
        if (gApplyButton.hasAttribute('disabled')) {
            gApplyButton.removeAttribute('disabled');
        }
    }
}

// Do the proper UI updates for a user change.
//  "field" (string) indicates the field to update.
//  "initializing" (boolean, optional) indicates that the dialog is still
//      initializing so some updates, e.g. enabling the <Apply> button, should
//      not be done.
function UpdateField(field, initializing /* =false */)
{
    try {
        if (typeof(initializing) == "undefined" || initializing == null) initializing = false;

        // Only take action if there was an actual change. Otherwise things like
        // the <Alt-A> shortcut when in a textbox will cause a cycle in reenabling
        // the apply button.
        var changed = false;

        switch (field) {
            case 'name':
                var name = partname.value;
                if (name) {
                    document.title = "'"+name+"' Properties";
                } else {
                    document.title = "Unnamed " + gPart.prettytype + " Properties";
                }
                changed = true;
                break;
            case 'priority':
            case 'accesskey':
                changed = true;
                break;
        }

        if (!initializing && changed) {
            UpdateOK();
        }
    } catch (e) {
        log.exception(e);
    }
}

function Cancel()  {
    window.arguments[0].res= false;
    window.close();
};


function keypressForPriority(event) {
    // Filter out all characters except for digits
    if (event.charCode) {
        if (event.charCode < '0'.charCodeAt(0) ||
            event.charCode > '9'.charCodeAt(0)) {
            event.preventDefault();
            event.cancelBubble = true;
        }
    }
}
