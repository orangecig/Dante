(function() {
  window.Dante = {
    Editor: {
      ToolTip: {},
      PopOver: {},
      Menu: {}
    },
    defaults: {
      image_placeholder: '../images/dante/media-loading-placeholder.png'
    },
    version: "0.0.4"
  };

}).call(this);
(function() {
  var LINE_HEIGHT, is_caret_at_end_of_node, is_caret_at_start_of_node, utils;

  String.prototype.killWhiteSpace = function() {
    return this.replace(/\s/g, '');
  };

  String.prototype.reduceWhiteSpace = function() {
    return this.replace(/\s+/g, ' ');
  };

  utils = {};

  window.Dante.utils = utils;

  utils.log = function(message, force) {
    if (window.debugMode || force) {
      return console.log(message);
    }
  };

  utils.getBase64Image = function(img) {
    var canvas, ctx, dataURL;
    canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    dataURL = canvas.toDataURL("image/png");
    return dataURL;
  };

  utils.generateUniqueName = function() {
    return Math.random().toString(36).slice(8);
  };

  utils.saveSelection = function() {
    var i, len, ranges, sel;
    if (window.getSelection) {
      sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        ranges = [];
        i = 0;
        len = sel.rangeCount;
        while (i < len) {
          ranges.push(sel.getRangeAt(i));
          ++i;
        }
        return ranges;
      }
    } else {
      if (document.selection && document.selection.createRange) {
        return document.selection.createRange();
      }
    }
    return null;
  };

  utils.restoreSelection = function(savedSel) {
    var i, len, sel;
    if (savedSel) {
      if (window.getSelection) {
        sel = window.getSelection();
        sel.removeAllRanges();
        i = 0;
        len = savedSel.length;
        while (i < len) {
          sel.addRange(savedSel[i]);
          ++i;
        }
      } else {
        if (document.selection && savedSel.select) {
          savedSel.select();
        }
      }
    }
  };

  utils.getNode = function() {
    var container, range, sel;
    range = void 0;
    sel = void 0;
    container = void 0;
    if (document.selection && document.selection.createRange) {
      range = document.selection.createRange();
      return range.parentElement();
    } else if (window.getSelection) {
      sel = window.getSelection();
      if (sel.getRangeAt) {
        if (sel.rangeCount > 0) {
          range = sel.getRangeAt(0);
        }
      } else {
        range = document.createRange();
        range.setStart(sel.anchorNode, sel.anchorOffset);
        range.setEnd(sel.focusNode, sel.focusOffset);
        if (range.collapsed !== sel.isCollapsed) {
          range.setStart(sel.focusNode, sel.focusOffset);
          range.setEnd(sel.anchorNode, sel.anchorOffset);
        }
      }
      if (range) {
        container = range.commonAncestorContainer;
        if (container.nodeType === 3) {
          return container.parentNode;
        } else {
          return container;
        }
      }
    }
  };

  utils.getSelectionDimensions = function() {
    var height, left, range, rect, sel, top, width;
    sel = document.selection;
    range = void 0;
    width = 0;
    height = 0;
    left = 0;
    top = 0;
    if (sel) {
      if (sel.type !== "Control") {
        range = sel.createRange();
        width = range.boundingWidth;
        height = range.boundingHeight;
      }
    } else if (window.getSelection) {
      sel = window.getSelection();
      if (sel.rangeCount) {
        range = sel.getRangeAt(0).cloneRange();
        if (range.getBoundingClientRect) {
          rect = range.getBoundingClientRect();
          width = rect.right - rect.left;
          height = rect.bottom - rect.top;
        }
      }
    }
    return {
      width: width,
      height: height,
      top: rect.top,
      left: rect.left
    };
  };

  utils.getCaretPosition = function(editableDiv) {
    var caretPos, containerEl, range, sel, tempEl, tempRange;
    caretPos = 0;
    containerEl = null;
    sel = void 0;
    range = void 0;
    if (window.getSelection) {
      sel = window.getSelection();
      if (sel.rangeCount) {
        range = sel.getRangeAt(0);
        if (range.commonAncestorContainer.parentNode === editableDiv) {
          caretPos = range.endOffset;
        }
      }
    } else if (document.selection && document.selection.createRange) {
      range = document.selection.createRange();
      if (range.parentElement() === editableDiv) {
        tempEl = document.createElement("span");
        editableDiv.insertBefore(tempEl, editableDiv.firstChild);
        tempRange = range.duplicate();
        tempRange.moveToElementText(tempEl);
        tempRange.setEndPoint("EndToEnd", range);
        caretPos = tempRange.text.length;
      }
    }
    return caretPos;
  };

  utils.isElementInViewport = function(el) {
    var rect;
    if (typeof jQuery === "function" && el instanceof jQuery) {
      el = el[0];
    }
    rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
  };

  LINE_HEIGHT = 20;

  is_caret_at_start_of_node = function(node, range) {
    var pre_range;
    pre_range = document.createRange();
    pre_range.selectNodeContents(node);
    pre_range.setEnd(range.startContainer, range.startOffset);
    return pre_range.toString().trim().length === 0;
  };

  is_caret_at_end_of_node = function(node, range) {
    var post_range;
    post_range = document.createRange();
    post_range.selectNodeContents(node);
    post_range.setStart(range.endContainer, range.endOffset);
    return post_range.toString().trim().length === 0;
  };

  $.fn.editableIsCaret = function() {
    return window.getSelection().type === 'Caret';
  };

  $.fn.editableRange = function() {
    var sel;
    sel = window.getSelection();
    if (!(sel.rangeCount > 0)) {
      return;
    }
    return sel.getRangeAt(0);
  };

  $.fn.editableCaretRange = function() {
    if (!this.editableIsCaret()) {
      return;
    }
    return this.editableRange();
  };

  $.fn.editableSetRange = function(range) {
    var sel;
    sel = window.getSelection();
    if (sel.rangeCount > 0) {
      sel.removeAllRanges();
    }
    return sel.addRange(range);
  };

  $.fn.editableFocus = function(at_start) {
    var range, sel;
    if (at_start == null) {
      at_start = true;
    }
    if (!this.attr('contenteditable')) {
      return;
    }
    sel = window.getSelection();
    if (sel.rangeCount > 0) {
      sel.removeAllRanges();
    }
    range = document.createRange();
    range.selectNodeContents(this[0]);
    range.collapse(at_start);
    return sel.addRange(range);
  };

  $.fn.editableCaretAtStart = function() {
    var range;
    range = this.editableRange();
    if (!range) {
      return false;
    }
    return is_caret_at_start_of_node(this[0], range);
  };

  $.fn.editableCaretAtEnd = function() {
    var range;
    range = this.editableRange();
    if (!range) {
      return false;
    }
    return is_caret_at_end_of_node(this[0], range);
  };

  $.fn.editableCaretOnFirstLine = function() {
    var ctop, etop, range;
    range = this.editableRange();
    if (!range) {
      return false;
    }
    if (is_caret_at_start_of_node(this[0], range)) {
      return true;
    } else if (is_caret_at_end_of_node(this[0], range)) {
      ctop = this[0].getBoundingClientRect().bottom - LINE_HEIGHT;
    } else {
      ctop = range.getClientRects()[0].top;
    }
    etop = this[0].getBoundingClientRect().top;
    return ctop < etop + LINE_HEIGHT;
  };

  $.fn.editableCaretOnLastLine = function() {
    var cbtm, ebtm, range;
    range = this.editableRange();
    if (!range) {
      return false;
    }
    if (is_caret_at_end_of_node(this[0], range)) {
      return true;
    } else if (is_caret_at_start_of_node(this[0], range)) {
      cbtm = this[0].getBoundingClientRect().top + LINE_HEIGHT;
    } else {
      cbtm = range.getClientRects()[0].bottom;
    }
    ebtm = this[0].getBoundingClientRect().bottom;
    return cbtm > ebtm - LINE_HEIGHT;
  };

  $.fn.exists = function() {
    return this.length > 0;
  };

}).call(this);
(function() {
  Dante.View = (function() {
    function View(opts) {
      if (opts == null) {
        opts = {};
      }
      if (opts.el) {
        this.el = opts.el;
      }
      this._ensureElement();
      this.initialize.apply(this, arguments);
      this._ensureEvents();
    }

    View.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
    };

    View.prototype.events = function() {};

    View.prototype.render = function() {
      return this;
    };

    View.prototype.remove = function() {
      this._removeElement();
      this.stopListening();
      return this;
    };

    View.prototype._removeElement = function() {
      return this.$el.remove();
    };

    View.prototype.setElement = function(element) {
      this._setElement(element);
      return this;
    };

    View.prototype.setEvent = function(opts) {
      if (!_.isEmpty(opts)) {
        return _.each(opts, (function(_this) {
          return function(f, key) {
            var element, func, key_arr;
            key_arr = key.split(" ");
            if (_.isFunction(f)) {
              func = f;
            } else if (_.isString(f)) {
              func = _this[f];
            } else {
              throw "error event needs a function or string";
            }
            element = key_arr.length > 1 ? key_arr.splice(1, 3).join(" ") : null;
            return $(_this.el).on(key_arr[0], element, _.bind(func, _this));
          };
        })(this));
      }
    };

    View.prototype._ensureElement = function() {
      return this.setElement(_.result(this, 'el'));
    };

    View.prototype._ensureEvents = function() {
      return this.setEvent(_.result(this, 'events'));
    };

    View.prototype._setElement = function(el) {
      this.$el = el instanceof $ ? el : $(el);
      return this.el = this.$el[0];
    };

    return View;

  })();

}).call(this);
(function() {
  var utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = Dante.utils;

  Dante.Editor = (function(_super) {
    __extends(Editor, _super);

    function Editor() {
      this.setupFirstAndLast = __bind(this.setupFirstAndLast, this);
      this.addClassesToElement = __bind(this.addClassesToElement, this);
      this.handlePaste = __bind(this.handlePaste, this);
      this.handleArrowForKeyDown = __bind(this.handleArrowForKeyDown, this);
      this.handleArrow = __bind(this.handleArrow, this);
      this.handleMouseUp = __bind(this.handleMouseUp, this);
      this.selection = __bind(this.selection, this);
      this.render = __bind(this.render, this);
      this.restart = __bind(this.restart, this);
      this.start = __bind(this.start, this);
      this.appendInitialContent = __bind(this.appendInitialContent, this);
      this.appendMenus = __bind(this.appendMenus, this);
      this.template = __bind(this.template, this);
      this.initialize = __bind(this.initialize, this);
      return Editor.__super__.constructor.apply(this, arguments);
    }

    Editor.prototype.events = {
      "mouseup": "handleMouseUp",
      "keydown": "handleKeyDown",
      "keyup": "handleKeyUp",
      "paste": "handlePaste",
      "dblclick": "handleDblclick",
      "dragstart": "handleDrag",
      "drop": "handleDrag",
      "click .graf--figure .aspectRatioPlaceholder": "handleGrafFigureSelectImg",
      "click .graf--figure figcaption": "handleGrafFigureSelectCaption",
      "mouseover .markup--anchor": "displayPopOver",
      "mouseout  .markup--anchor": "hidePopOver"
    };

    Editor.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      this.editor_options = opts;
      this.initial_html = $(this.el).html();
      this.current_range = null;
      this.current_node = null;
      this.el = opts.el || "#editor";
      this.upload_url = opts.upload_url || "/uploads.json";
      this.oembed_url = opts.oembed_url || "http://api.embed.ly/1/oembed?url=";
      this.extract_url = opts.extract_url || "http://api.embed.ly/1/extract?key=86c28a410a104c8bb58848733c82f840&url=";
      this.default_loading_placeholder = opts.default_loading_placeholder || Dante.defaults.image_placeholder;
      this.store_url = opts.store_url;
      this.spell_check = opts.spellcheck || false;
      this.disable_title = opts.disable_title || false;
      this.store_interval = opts.store_interval || 15000;
      window.debugMode = opts.debug || false;
      if (window.debugMode) {
        $(this.el).addClass("debug");
      }
      if (localStorage.getItem('contenteditable')) {
        $(this.el).html(localStorage.getItem('contenteditable'));
      }
      this.store();
      this.title_placeholder = "<span class='defaultValue defaultValue--root'>Title</span><br>";
      this.body_placeholder = "<span class='defaultValue defaultValue--root'>Tell your story…</span><br>";
      this.embed_placeholder = "<span class='defaultValue defaultValue--prompt'>Paste a YouTube, Vine, Vimeo, or other video link, and press Enter</span><br>";
      return this.extract_placeholder = "<span class='defaultValue defaultValue--prompt'>Paste a link to embed content from another site (e.g. Twitter) and press Enter</span><br>";
    };

    Editor.prototype.store = function() {
      if (!this.store_url) {
        return;
      }
      return setTimeout((function(_this) {
        return function() {
          return _this.checkforStore();
        };
      })(this), this.store_interval);
    };

    Editor.prototype.checkforStore = function() {
      if (this.content === this.getContent()) {
        utils.log("content not changed skip store");
        return this.store();
      } else {
        utils.log("content changed! update");
        this.content = this.getContent();
        return $.ajax({
          url: this.store_url,
          method: "post",
          data: this.getContent(),
          success: function(res) {
            utils.log("store!");
            return utils.log(res);
          },
          complete: (function(_this) {
            return function(jxhr) {
              return _this.store();
            };
          })(this)
        });
      }
    };

    Editor.prototype.getContent = function() {
      return $(this.el).find(".section-inner").html();
    };

    Editor.prototype.renderTitle = function() {
      return "<h3 class='graf graf--h3'>" + this.title_placeholder + " </h3>";
    };

    Editor.prototype.template = function() {
      return "<section class='section--first section--last'> <div class='section-divider layoutSingleColumn'> <hr class='section-divider'> </div> <div class='section-content'> <div class='section-inner layoutSingleColumn'> " + (this.disable_title ? '' : this.renderTitle()) + " <p class='graf graf--p'>" + this.body_placeholder + "<p> </div> </div> </section>";
    };

    Editor.prototype.baseParagraphTmpl = function() {
      return "<p class='graf--p' name='" + (utils.generateUniqueName()) + "'><br></p>";
    };

    Editor.prototype.appendMenus = function() {
      $("<div id='dante-menu' class='dante-menu'></div>").insertAfter(this.el);
      $("<div class='inlineTooltip'></div>").insertAfter(this.el);
      this.editor_menu = new Dante.Editor.Menu({
        editor: this
      });
      this.tooltip_view = new Dante.Editor.Tooltip({
        editor: this
      });
      this.pop_over = new Dante.Editor.PopOver({
        editor: this
      });
      this.pop_over.render().hide();
      return this.tooltip_view.render().hide();
    };

    Editor.prototype.appendInitialContent = function() {
      $(this.el).find(".section-inner").html(this.initial_html);
      return $(this.el).attr("spellcheck", this.spell_check);
    };

    Editor.prototype.start = function() {
      this.render();
      $(this.el).attr("contenteditable", "true");
      $(this.el).addClass("postField postField--body editable smart-media-plugin");
      $(this.el).wrap("<article class='postArticle'><div class='postContent'><div class='notesSource'></div></div></article>");
      this.appendMenus();
      if (!_.isEmpty(this.initial_html.trim())) {
        this.appendInitialContent();
      }
      return this.parseInitialMess();
    };

    Editor.prototype.restart = function() {
      return this.render();
    };

    Editor.prototype.render = function() {
      this.template();
      return $(this.el).html(this.template());
    };

    Editor.prototype.getSelectedText = function() {
      var text;
      text = "";
      if (typeof window.getSelection !== "undefined") {
        text = window.getSelection().toString();
      } else if (typeof document.selection !== "undefined" && document.selection.type === "Text") {
        text = document.selection.createRange().text;
      }
      return text;
    };

    Editor.prototype.selection = function() {
      selection;
      var selection;
      if (window.getSelection) {
        return selection = window.getSelection();
      } else if (document.selection && document.selection.type !== "Control") {
        return selection = document.selection;
      }
    };

    Editor.prototype.getRange = function() {
      var editor, range;
      editor = $(this.el)[0];
      range = selection && selection.rangeCount && selection.getRangeAt(0);
      if (!range) {
        range = document.createRange();
      }
      if (!editor.contains(range.commonAncestorContainer)) {
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      return range;
    };

    Editor.prototype.setRange = function(range) {
      range = range || this.current_range;
      if (!range) {
        range = this.getRange();
        range.collapse(false);
      }
      this.selection().removeAllRanges();
      this.selection().addRange(range);
      return this;
    };

    Editor.prototype.getCharacterPrecedingCaret = function() {
      var precedingChar, precedingRange, range, sel;
      precedingChar = "";
      sel = void 0;
      range = void 0;
      precedingRange = void 0;
      if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount > 0) {
          range = sel.getRangeAt(0).cloneRange();
          range.collapse(true);
          range.setStart(this.getNode(), 0);
          precedingChar = range.toString().slice(0);
        }
      } else if ((sel = document.selection) && sel.type !== "Control") {
        range = sel.createRange();
        precedingRange = range.duplicate();
        precedingRange.moveToElementText(containerEl);
        precedingRange.setEndPoint("EndToStart", range);
        precedingChar = precedingRange.text.slice(0);
      }
      return precedingChar;
    };

    Editor.prototype.isLastChar = function() {
      return $(this.getNode()).text().trim().length === this.getCharacterPrecedingCaret().trim().length;
    };

    Editor.prototype.isFirstChar = function() {
      return this.getCharacterPrecedingCaret().trim().length === 0;
    };

    Editor.prototype.isSelectingAll = function(element) {
      var a, b;
      a = this.getSelectedText().killWhiteSpace().length;
      b = $(element).text().killWhiteSpace().length;
      return a === b;
    };

    Editor.prototype.setRangeAt = function(element, int) {
      var range, sel;
      if (int == null) {
        int = 0;
      }
      range = document.createRange();
      sel = window.getSelection();
      range.setStart(element, int);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return element.focus();
    };

    Editor.prototype.setRangeAtText = function(element, int) {
      var node, range, sel;
      if (int == null) {
        int = 0;
      }
      range = document.createRange();
      sel = window.getSelection();
      node = element.firstChild;
      range.setStart(node, 0);
      range.setEnd(node, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return element.focus();
    };

    Editor.prototype.focus = function(focusStart) {
      if (!focusStart) {
        this.setRange();
      }
      $(this.el).focus();
      return this;
    };

    Editor.prototype.focusNode = function(node, range) {
      range.setStartAfter(node);
      range.setEndBefore(node);
      range.collapse(false);
      return this.setRange(range);
    };

    Editor.prototype.getNode = function() {
      var node, range, root;
      node = void 0;
      root = $(this.el).find(".section-inner")[0];
      if (this.selection().rangeCount < 1) {
        return;
      }
      range = this.selection().getRangeAt(0);
      node = range.commonAncestorContainer;
      if (!node || node === root) {
        return null;
      }
      while (node && (node.nodeType !== 1) && (node.parentNode !== root)) {
        node = node.parentNode;
      }
      while (node && (node.parentNode !== root)) {
        node = node.parentNode;
      }
      if (root && root.contains(node)) {
        return node;
      } else {
        return null;
      }
    };

    Editor.prototype.displayMenu = function(sel) {
      return setTimeout((function(_this) {
        return function() {
          var pos;
          _this.editor_menu.render();
          pos = utils.getSelectionDimensions();
          _this.relocateMenu(pos);
          return _this.editor_menu.show();
        };
      })(this), 10);
    };

    Editor.prototype.handleDrag = function() {
      return false;
    };

    Editor.prototype.handleTextSelection = function(anchor_node) {
      var text;
      this.editor_menu.hide();
      text = this.getSelectedText();
      if (!$(anchor_node).is(".graf--mixtapeEmbed, .graf--figure") && !_.isEmpty(text.trim())) {
        this.current_node = anchor_node;
        return this.displayMenu();
      }
    };

    Editor.prototype.relocateMenu = function(position) {
      var height, left, padd, top;
      height = this.editor_menu.$el.outerHeight();
      padd = this.editor_menu.$el.width() / 2;
      top = position.top + $(window).scrollTop() - height;
      left = position.left + (position.width / 2) - padd;
      return this.editor_menu.$el.offset({
        left: left,
        top: top
      });
    };

    Editor.prototype.hidePlaceholder = function(element) {
      return $(element).find("span.defaultValue").remove().html("<br>");
    };

    Editor.prototype.displayEmptyPlaceholder = function(element) {
      $(".graf--first").html(this.title_placeholder);
      return $(".graf--last").html(this.body_placeholder);
    };

    Editor.prototype.displayPopOver = function(ev) {
      return this.pop_over.displayAt(ev);
    };

    Editor.prototype.hidePopOver = function(ev) {
      return this.pop_over.hide(ev);
    };

    Editor.prototype.handleGrafFigureSelectImg = function(ev) {
      var element;
      utils.log("FIGURE SELECT");
      element = ev.currentTarget;
      this.markAsSelected(element);
      $(element).parent(".graf--figure").addClass("is-selected is-mediaFocused");
      return this.selection().removeAllRanges();
    };

    Editor.prototype.handleGrafFigureSelectCaption = function(ev) {
      var element;
      utils.log("FIGCAPTION");
      element = ev.currentTarget;
      return $(element).parent(".graf--figure").removeClass("is-mediaFocused");
    };

    Editor.prototype.handleMouseUp = function(ev) {
      var anchor_node;
      utils.log("MOUSE UP");
      anchor_node = this.getNode();
      if (_.isNull(anchor_node)) {
        return;
      }
      this.prev_current_node = anchor_node;
      this.handleTextSelection(anchor_node);
      this.hidePlaceholder(anchor_node);
      this.markAsSelected(anchor_node);
      return this.displayTooltipAt(anchor_node);
    };

    Editor.prototype.scrollTo = function(node) {
      var top;
      if (utils.isElementInViewport($(node))) {
        return;
      }
      top = node.offset().top;
      return $('html, body').animate({
        scrollTop: top
      }, 20);
    };

    Editor.prototype.handleArrow = function(ev) {
      var current_node;
      current_node = $(this.getNode());
      if (current_node.length > 0) {
        this.markAsSelected(current_node);
        return this.displayTooltipAt(current_node);
      }
    };

    Editor.prototype.handleArrowForKeyDown = function(ev) {
      var caret_node, current_node, ev_type, n, next_node, num, prev_node;
      caret_node = this.getNode();
      current_node = $(caret_node);
      utils.log(ev);
      ev_type = ev.originalEvent.key || ev.originalEvent.keyIdentifier;
      utils.log("ENTER ARROW for key " + ev_type);
      switch (ev_type) {
        case "Down":
          if (_.isUndefined(current_node) || !current_node.exists()) {
            if ($(".is-selected").exists()) {
              current_node = $(".is-selected");
            }
          }
          next_node = current_node.next();
          utils.log("NEXT NODE IS " + (next_node.attr('class')));
          utils.log("CURRENT NODE IS " + (current_node.attr('class')));
          if (!$(current_node).hasClass("graf")) {
            return;
          }
          if (!(current_node.hasClass("graf--figure") || $(current_node).editableCaretOnLastLine())) {
            return;
          }
          utils.log("ENTER ARROW PASSED RETURNS");
          if (next_node.hasClass("graf--figure") && caret_node) {
            n = next_node.find(".imageCaption");
            this.scrollTo(n);
            utils.log("1 down");
            utils.log(n[0]);
            this.skip_keyup = true;
            this.selection().removeAllRanges();
            this.markAsSelected(next_node);
            next_node.addClass("is-mediaFocused is-selected");
            return false;
          } else if (next_node.hasClass("graf--mixtapeEmbed")) {
            n = current_node.next(".graf--mixtapeEmbed");
            num = n[0].childNodes.length;
            this.setRangeAt(n[0], num);
            this.scrollTo(n);
            utils.log("2 down");
            return false;
          }
          if (current_node.hasClass("graf--figure") && next_node.hasClass("graf")) {
            this.scrollTo(next_node);
            utils.log("3 down, from figure to next graf");
            this.markAsSelected(next_node);
            this.setRangeAt(next_node[0]);
            return false;
          }
          break;
        case "Up":
          prev_node = current_node.prev();
          utils.log("PREV NODE IS " + (prev_node.attr('class')));
          utils.log("CURRENT NODE IS up " + (current_node.attr('class')));
          if (!$(current_node).hasClass("graf")) {
            return;
          }
          if (!$(current_node).editableCaretOnFirstLine()) {
            return;
          }
          utils.log("ENTER ARROW PASSED RETURNS");
          if (prev_node.hasClass("graf--figure")) {
            utils.log("1 up");
            n = prev_node.find(".imageCaption");
            this.scrollTo(n);
            this.skip_keyup = true;
            this.selection().removeAllRanges();
            this.markAsSelected(prev_node);
            prev_node.addClass("is-mediaFocused");
            return false;
          } else if (prev_node.hasClass("graf--mixtapeEmbed")) {
            n = current_node.prev(".graf--mixtapeEmbed");
            num = n[0].childNodes.length;
            this.setRangeAt(n[0], num);
            this.scrollTo(n);
            utils.log("2 up");
            return false;
          }
          if (current_node.hasClass("graf--figure") && prev_node.hasClass("graf")) {
            this.setRangeAt(prev_node[0]);
            this.scrollTo(prev_node);
            utils.log("3 up");
            return false;
          } else if (prev_node.hasClass("graf")) {
            n = current_node.prev(".graf");
            num = n[0].childNodes.length;
            this.scrollTo(n);
            utils.log("4 up");
            this.skip_keyup = true;
            this.markAsSelected(prev_node);
            return false;
          }
      }
    };

    Editor.prototype.parseInitialMess = function() {
      return this.setupElementsClasses($(this.el).find('.section-inner'), (function(_this) {
        return function() {
          return _this.handleUnwrappedImages($(_this.el).find('.section-inner'));
        };
      })(this));
    };

    Editor.prototype.handleDblclick = function() {
      var node;
      utils.log("handleDblclick");
      node = this.getNode();
      if (_.isNull(node)) {
        this.setRangeAt(this.prev_current_node);
      }
      return false;
    };

    Editor.prototype.handlePaste = function(ev) {
      var cbd, pastedText;
      utils.log("pasted!");
      this.aa = this.getNode();
      pastedText = void 0;
      if (window.clipboardData && window.clipboardData.getData) {
        pastedText = window.clipboardData.getData('Text');
      } else if (ev.originalEvent.clipboardData && ev.originalEvent.clipboardData.getData) {
        cbd = ev.originalEvent.clipboardData;
        pastedText = _.isEmpty(cbd.getData('text/html')) ? cbd.getData('text/plain') : cbd.getData('text/html');
      }
      utils.log(pastedText);
      if (pastedText.match(/<\/*[a-z][^>]+?>/gi)) {
        utils.log("HTML DETECTED ON PASTE");
        $(pastedText);
        document.body.appendChild($("<div id='paste'></div>")[0]);
        $("#paste").html(pastedText);
        this.setupElementsClasses($("#paste"), (function(_this) {
          return function() {
            var last_node, new_node, nodes, num, top;
            nodes = $($("#paste").html()).insertAfter($(_this.aa));
            $("#paste").remove();
            last_node = nodes.last()[0];
            num = last_node.childNodes.length;
            _this.setRangeAt(last_node, num);
            new_node = $(_this.getNode());
            top = new_node.offset().top;
            _this.markAsSelected(new_node);
            _this.displayTooltipAt($(_this.el).find(".is-selected"));
            _this.handleUnwrappedImages(nodes);
            return $('html, body').animate({
              scrollTop: top
            }, 200);
          };
        })(this));
        return false;
      }
    };

    Editor.prototype.handleUnwrappedImages = function(elements) {
      return _.each(elements.find("img"), (function(_this) {
        return function(image) {
          utils.log("process image here!");
          return _this.tooltip_view.uploadExistentImage(image);
        };
      })(this));
    };

    Editor.prototype.handleInmediateDeletion = function(element) {
      var new_node;
      this.inmediateDeletion = false;
      new_node = $(this.baseParagraphTmpl()).insertBefore($(element));
      new_node.addClass("is-selected");
      this.setRangeAt($(element).prev()[0]);
      return $(element).remove();
    };

    Editor.prototype.handleUnwrappedNode = function(element) {
      var new_node, tmpl;
      tmpl = $(this.baseParagraphTmpl());
      this.setElementName(tmpl);
      $(element).wrap(tmpl);
      new_node = $("[name='" + (tmpl.attr('name')) + "']");
      new_node.addClass("is-selected");
      this.setRangeAt(new_node[0]);
      return false;
    };


    /*
    This is a rare hack only for FF (I hope),
    when there is no range it creates a new element as a placeholder,
    then finds previous element from that placeholder,
    then it focus the prev and removes the placeholder.
    a nasty nasty one...
     */

    Editor.prototype.handleNullAnchor = function() {
      var node, num, prev, range, sel, span;
      utils.log("WARNING! this is an empty node");
      sel = this.selection();
      if (sel.isCollapsed && sel.rangeCount > 0) {
        range = sel.getRangeAt(0);
        span = $(this.baseParagraphTmpl())[0];
        range.insertNode(span);
        range.setStart(span, 0);
        range.setEnd(span, 0);
        sel.removeAllRanges();
        sel.addRange(range);
        node = $(range.commonAncestorContainer);
        prev = node.prev();
        num = prev[0].childNodes.length;
        utils.log(prev);
        if (prev.hasClass("graf")) {
          this.setRangeAt(prev[0], num);
          node.remove();
          this.markAsSelected(this.getNode());
        } else if (prev.hasClass("graf--mixtapeEmbed")) {
          this.setRangeAt(prev[0], num);
          node.remove();
          this.markAsSelected(this.getNode());
        } else if (!prev) {
          this.setRangeAt(this.$el.find(".section-inner p")[0]);
        }
        return this.displayTooltipAt($(this.el).find(".is-selected"));
      }
    };

    Editor.prototype.handleCompleteDeletion = function(element) {
      if (_.isEmpty($(element).text().trim())) {
        utils.log("HANDLE COMPLETE DELETION");
        this.selection().removeAllRanges();
        this.render();
        setTimeout((function(_this) {
          return function() {
            return _this.setRangeAt($(_this.el).find(".section-inner p")[0]);
          };
        })(this), 20);
        return this.completeDeletion = true;
      }
    };

    Editor.prototype.handleTab = function(anchor_node) {
      var classes, next;
      utils.log("HANDLE TAB");
      classes = ".graf, .graf--mixtapeEmbed, .graf--figure, .graf--figure";
      next = $(anchor_node).next(classes);
      if ($(next).hasClass("graf--figure")) {
        next = $(next).find("figcaption");
        this.setRangeAt(next[0]);
        this.markAsSelected($(next).parent(".graf--figure"));
        this.displayTooltipAt(next);
        this.scrollTo($(next));
        return false;
      }
      if (_.isEmpty(next) || _.isUndefined(next[0])) {
        next = $(".graf:first");
      }
      this.setRangeAt(next[0]);
      this.markAsSelected(next);
      this.displayTooltipAt(next);
      return this.scrollTo($(next));
    };

    Editor.prototype.handleKeyDown = function(e) {
      var anchor_node, parent, utils_anchor_node;
      utils.log("KEYDOWN");
      anchor_node = this.getNode();
      if (anchor_node) {
        this.markAsSelected(anchor_node);
      }
      if (e.which === 9) {
        this.handleTab(anchor_node);
        return false;
      }
      if (e.which === 13) {
        $(this.el).find(".is-selected").removeClass("is-selected");
        parent = $(anchor_node);
        utils.log(this.isLastChar());
        if (parent.hasClass("is-embedable")) {
          this.tooltip_view.getEmbedFromNode($(anchor_node));
        } else if (parent.hasClass("is-extractable")) {
          this.tooltip_view.getExtractFromNode($(anchor_node));
        }
        if (parent.hasClass("graf--mixtapeEmbed") || parent.hasClass("graf--iframe") || parent.hasClass("graf--figure")) {
          utils.log("supress linebreak from embed !(last char)");
          if (!this.isLastChar()) {
            return false;
          }
        }
        if (parent.hasClass("graf--iframe") || parent.hasClass("graf--figure")) {
          if (this.isLastChar()) {
            this.handleLineBreakWith("p", parent);
            this.setRangeAtText($(".is-selected")[0]);
            $(".is-selected").trigger("mouseup");
            return false;
          } else {
            return false;
          }
        }
        this.tooltip_view.cleanOperationClasses($(anchor_node));
        if (anchor_node && this.editor_menu.lineBreakReg.test(anchor_node.nodeName)) {
          if (this.isLastChar()) {
            utils.log("new paragraph if it's the last character");
            e.preventDefault();
            this.handleLineBreakWith("p", parent);
          }
        }
        setTimeout((function(_this) {
          return function() {
            var node;
            node = _this.getNode();
            _this.setElementName($(node));
            if (node.nodeName.toLowerCase() === "div") {
              node = _this.replaceWith("p", $(node))[0];
            }
            _this.markAsSelected($(node));
            _this.setupFirstAndLast();
            if (_.isEmpty($(node).text().trim())) {
              _.each($(node).children(), function(n) {
                return $(n).remove();
              });
              $(node).append("<br>");
            }
            return _this.displayTooltipAt($(_this.el).find(".is-selected"));
          };
        })(this), 2);
      }
      if (e.which === 8) {
        this.tooltip_view.hide();
        utils.log("removing from down");
        if (this.reachedTop) {
          utils.log("REACHED TOP");
        }
        if (this.prevented || this.reachedTop && this.isFirstChar()) {
          return false;
        }
        utils.log("pass initial validations");
        anchor_node = this.getNode();
        utils_anchor_node = utils.getNode();
        if ($(utils_anchor_node).hasClass("section-content") || $(utils_anchor_node).hasClass("graf--first")) {
          utils.log("SECTION DETECTED FROM KEYDOWN " + (_.isEmpty($(utils_anchor_node).text())));
          if (_.isEmpty($(utils_anchor_node).text())) {
            return false;
          }
        }
        if (anchor_node && anchor_node.nodeType === 3) {
          utils.log("TextNode detected from Down!");
        }
        if ($(anchor_node).hasClass("graf--mixtapeEmbed") || $(anchor_node).hasClass("graf--iframe")) {
          if (_.isEmpty($(anchor_node).text().trim())) {
            utils.log("EMPTY CHAR");
            return false;
          } else {
            if (this.isFirstChar()) {
              utils.log("FIRST CHAR");
              if (this.isSelectingAll(anchor_node)) {
                this.inmediateDeletion = true;
              }
              return false;
            }
          }
        }
        if ($(anchor_node).prev().hasClass("graf--mixtapeEmbed")) {
          if (this.isFirstChar() && !_.isEmpty($(anchor_node).text().trim())) {
            return false;
          }
        }
        utils.log(anchor_node);
        if ($(".is-selected").hasClass("graf--figure")) {
          this.replaceWith("p", $(".is-selected"));
          this.setRangeAt($(".is-selected")[0]);
          return false;
        }
      }
      if (_.contains([38, 40], e.which)) {
        utils.log(e.which);
        this.handleArrowForKeyDown(e);
      }
      if (anchor_node) {
        if (!_.isEmpty($(anchor_node).text())) {
          this.tooltip_view.hide();
          $(anchor_node).removeClass("graf--empty");
        }
      }
      if (_.isUndefined(anchor_node) && $(".is-selected").hasClass("is-mediaFocused")) {
        this.setRangeAt($(".is-selected").find("figcaption")[0]);
        $(".is-selected").removeClass("is-mediaFocused");
        return false;
      }
    };

    Editor.prototype.handleKeyUp = function(e, node) {
      var anchor_node, utils_anchor_node;
      if (this.skip_keyup) {
        this.skip_keyup = null;
        utils.log("SKIP KEYUP");
        return false;
      }
      utils.log("KEYUP");
      this.editor_menu.hide();
      this.reachedTop = false;
      anchor_node = this.getNode();
      utils_anchor_node = utils.getNode();
      this.handleTextSelection(anchor_node);
      if (e.which === 8) {
        if ($(utils_anchor_node).hasClass("postField--body")) {
          utils.log("ALL GONE from UP");
          this.handleCompleteDeletion($(this.el));
          if (this.completeDeletion) {
            this.completeDeletion = false;
            return false;
          }
        }
        if ($(utils_anchor_node).hasClass("section-content") || $(utils_anchor_node).hasClass("graf--first")) {
          utils.log("SECTION DETECTED FROM KEYUP " + (_.isEmpty($(utils_anchor_node).text())));
          if (_.isEmpty($(utils_anchor_node).text())) {
            return false;
          }
        }
        if (_.isNull(anchor_node)) {
          this.handleNullAnchor();
          return false;
        }
        if ($(anchor_node).hasClass("graf--first")) {
          utils.log("THE FIRST ONE! UP");
          this.markAsSelected(anchor_node);
          this.setupFirstAndLast();
          false;
        }
        if (anchor_node) {
          this.markAsSelected(anchor_node);
          this.setupFirstAndLast();
          this.displayTooltipAt($(this.el).find(".is-selected"));
        }
      }
      if (_.contains([37, 38, 39, 40], e.which)) {
        return this.handleArrow(e);
      }
    };

    Editor.prototype.handleLineBreakWith = function(element_type, from_element) {
      var new_paragraph;
      new_paragraph = $("<" + element_type + " class='graf graf--" + element_type + " graf--empty is-selected'><br/></" + element_type + ">");
      if (from_element.parent().is('[class^="graf--"]')) {
        new_paragraph.insertAfter(from_element.parent());
      } else {
        new_paragraph.insertAfter(from_element);
      }
      this.setRangeAt(new_paragraph[0]);
      return this.scrollTo(new_paragraph);
    };

    Editor.prototype.replaceWith = function(element_type, from_element) {
      var new_paragraph;
      new_paragraph = $("<" + element_type + " class='graf graf--" + element_type + " graf--empty is-selected'><br/></" + element_type + ">");
      from_element.replaceWith(new_paragraph);
      this.setRangeAt(new_paragraph[0]);
      this.scrollTo(new_paragraph);
      return new_paragraph;
    };

    Editor.prototype.displayTooltipAt = function(element) {
      utils.log("POSITION FOR TOOLTIP");
      if (!element) {
        return;
      }
      this.tooltip_view.hide();
      if (!_.isEmpty($(element).text())) {
        return;
      }
      this.position = $(element).offset();
      this.tooltip_view.render();
      return this.tooltip_view.move({
        left: this.position.left - 60,
        top: this.position.top - 1
      });
    };

    Editor.prototype.markAsSelected = function(element) {
      if (_.isUndefined(element)) {
        return;
      }
      $(this.el).find(".is-selected").removeClass("is-mediaFocused is-selected");
      $(element).addClass("is-selected");
      $(element).find(".defaultValue").remove();
      if ($(element).hasClass("graf--first")) {
        this.reachedTop = true;
        if ($(element).find("br").length === 0) {
          return $(element).append("<br>");
        }
      }
    };

    Editor.prototype.addClassesToElement = function(element) {
      var n, name, new_el;
      n = element;
      name = n.nodeName.toLowerCase();
      switch (name) {
        case "p":
        case "pre":
        case "div":
          if (!$(n).hasClass("graf--mixtapeEmbed")) {
            $(n).removeClass().addClass("graf graf--" + name);
          }
          if (name === "p" && $(n).find("br").length === 0) {
            $(n).append("<br>");
          }
          break;
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6":
          if (name === "h1") {
            new_el = $("<h2 class='graf graf--h2'>" + ($(n).text()) + "</h2>");
            $(n).replaceWith(new_el);
            this.setElementName(n);
          } else {
            $(n).removeClass().addClass("graf graf--" + name);
          }
          break;
        case "code":
          $(n).unwrap().wrap("<p class='graf graf--pre'></p>");
          n = $(n).parent();
          break;
        case "ol":
        case "ul":
          $(n).removeClass().addClass("postList");
          _.each($(n).find("li"), function(li) {
            return $(n).removeClass().addClass("graf graf--li");
          });
          break;
        case "img":
          utils.log("images");
          this.tooltip_view.uploadExistentImage(n);
          break;
        case "a":
        case 'strong':
        case 'em':
        case 'br':
        case 'b':
        case 'u':
        case 'i':
          utils.log("links");
          $(n).wrap("<p class='graf graf--p'></p>");
          n = $(n).parent();
          break;
        case "blockquote":
          n = $(n).removeClass().addClass("graf graf--" + name);
          break;
        case "figure":
          if ($(n).hasClass(".graf--figure")) {
            n = $(n);
          }
          break;
        default:
          $(n).wrap("<p class='graf graf--" + name + "'></p>");
          n = $(n).parent();
      }
      return n;
    };

    Editor.prototype.setupElementsClasses = function(element, cb) {
      if (_.isUndefined(element)) {
        this.element = $(this.el).find('.section-inner');
      } else {
        this.element = element;
      }
      return setTimeout((function(_this) {
        return function() {
          _this.cleanContents(_this.element);
          _this.wrapTextNodes(_this.element);
          _.each(_this.element.children(), function(n) {
            var name;
            name = $(n).prop("tagName").toLowerCase();
            n = _this.addClassesToElement(n);
            return _this.setElementName(n);
          });
          _this.setupLinks(_this.element.find("a"));
          _this.setupFirstAndLast();
          if (_.isFunction(cb)) {
            return cb();
          }
        };
      })(this), 20);
    };

    Editor.prototype.cleanContents = function(element) {
      var s;
      if (_.isUndefined(element)) {
        this.element = $(this.el).find('.section-inner');
      } else {
        this.element = element;
      }
      s = new Sanitize({
        elements: ['strong', 'img', 'em', 'br', 'a', 'blockquote', 'b', 'u', 'i', 'pre', 'p', 'h1', 'h2', 'h3', 'h4'],
        attributes: {
          '__ALL__': ['class'],
          a: ['href', 'title', 'target'],
          img: ['src']
        },
        protocols: {
          a: {
            href: ['http', 'https', 'mailto']
          }
        },
        transformers: [
          function(input) {
            if (input.node_name === "span" && $(input.node).hasClass("defaultValue")) {
              return {
                whitelist_nodes: [input.node]
              };
            } else {
              return null;
            }
          }, function(input) {
            if (input.node_name === 'div' && $(input.node).hasClass("graf--mixtapeEmbed")) {
              return {
                whitelist_nodes: [input.node]
              };
            } else if (input.node_name === 'a' && $(input.node).parent(".graf--mixtapeEmbed").exists()) {
              return {
                attr_whitelist: ["style"]
              };
            } else {
              return null;
            }
          }, function(input) {
            if (input.node_name === 'figure' && $(input.node).hasClass("graf--iframe")) {
              return {
                whitelist_nodes: [input.node]
              };
            } else if (input.node_name === 'div' && $(input.node).hasClass("iframeContainer") && $(input.node).parent(".graf--iframe").exists()) {
              return {
                whitelist_nodes: [input.node]
              };
            } else if (input.node_name === 'iframe' && $(input.node).parent(".iframeContainer").exists()) {
              return {
                whitelist_nodes: [input.node]
              };
            } else if (input.node_name === 'figcaption' && $(input.node).parent(".graf--iframe").exists()) {
              return {
                whitelist_nodes: [input.node]
              };
            } else {
              return null;
            }
          }, function(input) {
            if (input.node_name === 'figure' && $(input.node).hasClass("graf--figure")) {
              return {
                whitelist_nodes: [input.node]
              };
            } else if (input.node_name === 'div' && ($(input.node).hasClass("aspectRatioPlaceholder") && $(input.node).parent(".graf--figure").exists())) {
              return {
                whitelist_nodes: [input.node]
              };
            } else if (input.node_name === 'div' && ($(input.node).hasClass("aspect-ratio-fill") && $(input.node).parent(".aspectRatioPlaceholder").exists())) {
              return {
                whitelist_nodes: [input.node]
              };
            } else if (input.node_name === 'img' && $(input.node).parent(".graf--figure").exists()) {
              return {
                whitelist_nodes: [input.node]
              };
            } else if (input.node_name === 'a' && $(input.node).parent(".graf--mixtapeEmbed").exists()) {
              return {
                attr_whitelist: ["style"]
              };
            } else if (input.node_name === 'figcaption' && $(input.node).parent(".graf--figure").exists()) {
              return {
                whitelist_nodes: [input.node]
              };
            } else if (input.node_name === 'span' && $(input.node).parent(".imageCaption").exists()) {
              return {
                whitelist_nodes: [input.node]
              };
            } else {
              return null;
            }
          }
        ]
      });
      if (this.element.exists()) {
        utils.log("CLEAN HTML");
        return this.element.html(s.clean_node(this.element[0]));
      }
    };

    Editor.prototype.setupLinks = function(elems) {
      return _.each(elems, (function(_this) {
        return function(n) {
          return _this.setupLink(n);
        };
      })(this));
    };

    Editor.prototype.setupLink = function(n) {
      var href, parent_name;
      parent_name = $(n).parent().prop("tagName").toLowerCase();
      $(n).addClass("markup--anchor markup--" + parent_name + "-anchor");
      href = $(n).attr("href");
      return $(n).attr("data-href", href);
    };

    Editor.prototype.preCleanNode = function(element) {
      var s;
      s = new Sanitize({
        elements: ['strong', 'em', 'br', 'a', 'b', 'u', 'i'],
        attributes: {
          a: ['href', 'title', 'target']
        },
        protocols: {
          a: {
            href: ['http', 'https', 'mailto']
          }
        }
      });
      $(element).html(s.clean_node(element[0]));
      element = this.addClassesToElement($(element)[0]);
      return $(element);
    };

    Editor.prototype.setupFirstAndLast = function() {
      var childs;
      childs = $(this.el).find(".section-inner").children();
      childs.removeClass("graf--last , graf--first");
      childs.first().addClass("graf--first");
      return childs.last().addClass("graf--last");
    };

    Editor.prototype.wrapTextNodes = function(element) {
      if (_.isUndefined(element)) {
        element = $(this.el).find('.section-inner');
      } else {
        element = element;
      }
      return element.contents().filter(function() {
        return this.nodeType === 3 && this.data.trim().length > 0;
      }).wrap("<p class='graf grap--p'></p>");
    };

    Editor.prototype.setElementName = function(element) {
      return $(element).attr("name", utils.generateUniqueName());
    };

    return Editor;

  })(Dante.View);

}).call(this);
(function() {
  var utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = Dante.utils;

  Dante.Editor.Tooltip = (function(_super) {
    __extends(Tooltip, _super);

    function Tooltip() {
      this.hide = __bind(this.hide, this);
      this.getExtract = __bind(this.getExtract, this);
      this.getExtractFromNode = __bind(this.getExtractFromNode, this);
      this.getEmbedFromNode = __bind(this.getEmbedFromNode, this);
      this.uploadCompleted = __bind(this.uploadCompleted, this);
      this.updateProgressBar = __bind(this.updateProgressBar, this);
      this.uploadFile = __bind(this.uploadFile, this);
      this.uploadFiles = __bind(this.uploadFiles, this);
      this.toggleOptions = __bind(this.toggleOptions, this);
      this.render = __bind(this.render, this);
      this.initialize = __bind(this.initialize, this);
      return Tooltip.__super__.constructor.apply(this, arguments);
    }

    Tooltip.prototype.el = ".inlineTooltip";

    Tooltip.prototype.events = {
      "click .inlineTooltip-button.control": "toggleOptions",
      "click .inlineTooltip-menu button": "handleClick"
    };

    Tooltip.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      this.current_editor = opts.editor;
      return this.buttons = [
        {
          icon: "fa-camera",
          title: "Add an image",
          action: "image"
        }, {
          icon: "fa-play",
          title: "Add a video",
          action: "embed"
        }, {
          icon: "fa-code",
          title: "Add an embed",
          action: "embed-extract"
        }
      ];
    };

    Tooltip.prototype.template = function() {
      var menu;
      menu = "";
      _.each(this.buttons, function(b) {
        var data_action_value;
        data_action_value = b.action_value ? "data-action-value='" + b.action_value + "'" : "";
        return menu += "<button class='inlineTooltip-button scale' title='" + b.title + "' data-action='inline-menu-" + b.action + "' " + data_action_value + "> <span class='fa " + b.icon + "'></span> </button>";
      });
      return "<button class='inlineTooltip-button control' title='Close Menu' data-action='inline-menu'> <span class='fa fa-plus'></span> </button> <div class='inlineTooltip-menu'> " + menu + " </div>";
    };

    Tooltip.prototype.insertTemplate = function() {
      return "<figure contenteditable='false' class='graf graf--figure is-defaultValue' name='" + (utils.generateUniqueName()) + "' tabindex='0'> <div style='' class='aspectRatioPlaceholder is-locked'> <div style='padding-bottom: 100%;' class='aspect-ratio-fill'></div> <img src='' data-height='' data-width='' data-image-id='' class='graf-image' data-delayed-src=''> </div> <figcaption contenteditable='true' data-default-value='Type caption for image (optional)' class='imageCaption'> <span class='defaultValue'>Type caption for image (optional)</span> <br> </figcaption> </figure>";
    };

    Tooltip.prototype.extractTemplate = function() {
      return "<div class='graf graf--mixtapeEmbed is-selected' name=''> <a target='_blank' data-media-id='' class='js-mixtapeImage mixtapeImage mixtapeImage--empty u-ignoreBlock' href=''> </a> <a data-tooltip-type='link' data-tooltip-position='bottom' data-tooltip='' title='' class='markup--anchor markup--mixtapeEmbed-anchor' data-href='' href='' target='_blank'> <strong class='markup--strong markup--mixtapeEmbed-strong'></strong> <em class='markup--em markup--mixtapeEmbed-em'></em> </a> </div>";
    };

    Tooltip.prototype.embedTemplate = function() {
      return "<figure contenteditable='false' class='graf--figure graf--iframe graf--first' name='504e' tabindex='0'> <div class='iframeContainer'> <iframe frameborder='0' width='700' height='393' data-media-id='' src='' data-height='480' data-width='854'> </iframe> </div> <figcaption contenteditable='true' data-default-value='Type caption for embed (optional)' class='imageCaption'> <a rel='nofollow' class='markup--anchor markup--figure-anchor' data-href='' href='' target='_blank'> </a> </figcaption> </figure>";
    };

    Tooltip.prototype.render = function() {
      $(this.el).html(this.template());
      return $(this.el).show();
    };

    Tooltip.prototype.toggleOptions = function() {
      utils.log("Toggle Options!!");
      $(this.el).toggleClass("is-active is-scaled");
      return false;
    };

    Tooltip.prototype.move = function(coords) {
      return $(this.el).offset(coords);
    };

    Tooltip.prototype.handleClick = function(ev) {
      var name;
      name = $(ev.currentTarget).data('action');
      utils.log(name);
      switch (name) {
        case "inline-menu-image":
          this.placeholder = "<p>PLACEHOLDER</p>";
          this.imageSelect(ev);
          break;
        case "inline-menu-embed":
          this.displayEmbedPlaceHolder();
          break;
        case "inline-menu-embed-extract":
          this.displayExtractPlaceHolder();
          break;
        case "inline-menu-hr":
          this.splitSection();
      }
      return false;
    };

    Tooltip.prototype.uploadExistentImage = function(image_element, opts) {
      var i, img, n, node, tmpl, _i, _ref;
      if (opts == null) {
        opts = {};
      }
      utils.log("process image here!");
      tmpl = $(this.insertTemplate());
      tmpl.find("img").attr('src', this.current_editor.default_loading_placeholder);
      if ($(image_element).parents(".graf").length > 0) {
        if ($(image_element).parents(".graf").hasClass("graf--figure")) {
          return;
        }
        utils.log("UNO");
        tmpl.insertBefore($(image_element).parents(".graf"));
        node = this.current_editor.getNode();
        if (node) {
          this.current_editor.preCleanNode($(node));
          this.current_editor.addClassesToElement(node);
        }
      } else {
        utils.log("DOS");
        img = $(image_element).parentsUntil(".section-inner").first();
        $(img).replaceWith(tmpl);
      }
      utils.log($("[name='" + (tmpl.attr('name')) + "']").attr("name"));
      this.replaceImg(image_element, $("[name='" + (tmpl.attr('name')) + "']"));
      n = $("[name='" + (tmpl.attr('name')) + "']").parentsUntil(".section-inner").length;
      if (n !== 0) {
        for (i = _i = 0, _ref = n - 1; _i <= _ref; i = _i += 1) {
          $("[name='" + (tmpl.attr('name')) + "']").unwrap();
        }
      }
      return utils.log("FIG");
    };

    Tooltip.prototype.replaceImg = function(image_element, figure) {
      var img, self;
      utils.log(figure.attr("name"));
      utils.log(figure);
      $(image_element).remove();
      img = new Image();
      img.src = image_element.src;
      self = this;
      return img.onload = function() {
        var ar;
        utils.log("replace image with loaded info");
        utils.log(figure.attr("name"));
        utils.log(this.width + 'x' + this.height);
        ar = self.getAspectRatio(this.width, this.height);
        figure.find(".aspectRatioPlaceholder").css({
          'max-width': ar.width,
          'max-height': ar.height
        });
        figure.find(".graf-image").attr({
          "data-height": this.height,
          "data-width": this.width
        });
        figure.find(".aspect-ratio-fill").css({
          "padding-bottom": "" + ar.ratio + "%"
        });
        return figure.find("img").attr("src", image_element.src);
      };
    };

    Tooltip.prototype.displayAndUploadImages = function(file) {
      return this.displayCachedImage(file);
    };

    Tooltip.prototype.imageSelect = function(ev) {
      var $selectFile, self;
      $selectFile = $('<input type="file" multiple="multiple">').click();
      self = this;
      return $selectFile.change(function() {
        var t;
        t = this;
        return self.uploadFiles(t.files);
      });
    };

    Tooltip.prototype.displayCachedImage = function(file) {
      var reader;
      this.current_editor.tooltip_view.hide();
      reader = new FileReader();
      reader.onload = (function(_this) {
        return function(e) {
          var img, node, self;
          img = new Image;
          img.src = e.target.result;
          node = _this.current_editor.getNode();
          self = _this;
          return img.onload = function() {
            var ar, img_tag, new_tmpl, replaced_node;
            new_tmpl = $(self.insertTemplate());
            replaced_node = $(new_tmpl).insertBefore($(node));
            img_tag = new_tmpl.find('img.graf-image').attr('src', e.target.result);
            img_tag.height = this.height;
            img_tag.width = this.width;
            utils.log("UPLOADED SHOW FROM CACHE");
            ar = self.getAspectRatio(this.width, this.height);
            replaced_node.find(".aspectRatioPlaceholder").css({
              'max-width': ar.width,
              'max-height': ar.height
            });
            replaced_node.find(".graf-image").attr({
              "data-height": this.height,
              "data-width": this.width
            });
            replaced_node.find(".aspect-ratio-fill").css({
              "padding-bottom": "" + ar.ratio + "%"
            });
            return self.uploadFile(file, replaced_node);
          };
        };
      })(this);
      return reader.readAsDataURL(file);
    };

    Tooltip.prototype.getAspectRatio = function(w, h) {
      var fill_ratio, height, maxHeight, maxWidth, ratio, result, width;
      maxWidth = 700;
      maxHeight = 700;
      ratio = 0;
      width = w;
      height = h;
      if (width > maxWidth) {
        ratio = maxWidth / width;
        height = height * ratio;
        width = width * ratio;
      } else if (height > maxHeight) {
        ratio = maxHeight / height;
        width = width * ratio;
        height = height * ratio;
      }
      fill_ratio = height / width * 100;
      result = {
        width: width,
        height: height,
        ratio: fill_ratio
      };
      utils.log(result);
      return result;
    };

    Tooltip.prototype.formatData = function(file) {
      var formData;
      formData = new FormData();
      formData.append('file', file);
      return formData;
    };

    Tooltip.prototype.uploadFiles = function(files) {
      var acceptedTypes, file, i, _results;
      acceptedTypes = {
        "image/png": true,
        "image/jpeg": true,
        "image/gif": true
      };
      i = 0;
      _results = [];
      while (i < files.length) {
        file = files[i];
        if (acceptedTypes[file.type] === true) {
          $(this.placeholder).append("<progress class=\"progress\" min=\"0\" max=\"100\" value=\"0\">0</progress>");
          this.displayAndUploadImages(file);
        }
        _results.push(i++);
      }
      return _results;
    };

    Tooltip.prototype.uploadFile = function(file, node) {
      var handleUp, n;
      n = node;
      handleUp = (function(_this) {
        return function(jqxhr) {
          return _this.uploadCompleted(jqxhr, n);
        };
      })(this);
      return $.ajax({
        type: "post",
        url: this.current_editor.upload_url,
        xhr: (function(_this) {
          return function() {
            var xhr;
            xhr = new XMLHttpRequest();
            xhr.upload.onprogress = _this.updateProgressBar;
            return xhr;
          };
        })(this),
        cache: false,
        contentType: false,
        success: (function(_this) {
          return function(response) {
            handleUp(response);
          };
        })(this),
        error: (function(_this) {
          return function(jqxhr) {
            return utils.log("ERROR: got error uploading file " + jqxhr.responseText);
          };
        })(this),
        processData: false,
        data: this.formatData(file)
      });
    };

    Tooltip.prototype.updateProgressBar = function(e) {
      var $progress, complete;
      $progress = $('.progress:first', this.$el);
      complete = "";
      if (e.lengthComputable) {
        complete = e.loaded / e.total * 100;
        complete = complete != null ? complete : {
          complete: 0
        };
        utils.log("complete");
        return utils.log(complete);
      }
    };

    Tooltip.prototype.uploadCompleted = function(url, node) {
      return node.find("img").attr("src", url);
    };

    Tooltip.prototype.displayEmbedPlaceHolder = function() {
      var ph;
      ph = this.current_editor.embed_placeholder;
      this.node = this.current_editor.getNode();
      $(this.node).html(ph).addClass("is-embedable");
      this.current_editor.setRangeAt(this.node);
      this.hide();
      return false;
    };

    Tooltip.prototype.getEmbedFromNode = function(node) {
      this.node_name = $(node).attr("name");
      return $.getJSON("" + this.current_editor.oembed_url + ($(this.node).text())).success((function(_this) {
        return function(data) {
          var iframe_src, replaced_node, tmpl, url;
          _this.node = $("[name=" + _this.node_name + "]");
          iframe_src = $(data.html).prop("src");
          tmpl = $(_this.embedTemplate());
          tmpl.attr("name", _this.node.attr("name"));
          $(_this.node).replaceWith(tmpl);
          replaced_node = $(".graf--iframe[name=" + (_this.node.attr("name")) + "]");
          replaced_node.find("iframe").attr("src", iframe_src);
          url = data.url || data.author_url;
          utils.log("URL IS " + url);
          replaced_node.find(".markup--anchor").attr("href", url).text(url);
          return _this.hide();
        };
      })(this));
    };

    Tooltip.prototype.displayExtractPlaceHolder = function() {
      var ph;
      ph = this.current_editor.extract_placeholder;
      this.node = this.current_editor.getNode();
      $(this.node).html(ph).addClass("is-extractable");
      this.current_editor.setRangeAt(this.node);
      this.hide();
      return false;
    };

    Tooltip.prototype.getExtractFromNode = function(node) {
      this.node_name = $(node).attr("name");
      return $.getJSON("" + this.current_editor.extract_url + ($(this.node).text())).success((function(_this) {
        return function(data) {
          var iframe_src, image_node, replaced_node, tmpl;
          _this.node = $("[name=" + _this.node_name + "]");
          iframe_src = $(data.html).prop("src");
          tmpl = $(_this.extractTemplate());
          tmpl.attr("name", _this.node.attr("name"));
          $(_this.node).replaceWith(tmpl);
          replaced_node = $(".graf--mixtapeEmbed[name=" + (_this.node.attr("name")) + "]");
          replaced_node.find("strong").text(data.title);
          replaced_node.find("em").text(data.description);
          replaced_node.append(data.provider_url);
          replaced_node.find(".markup--anchor").attr("href", data.url);
          if (!_.isEmpty(data.images)) {
            image_node = replaced_node.find(".mixtapeImage");
            image_node.css("background-image", "url(" + data.images[0].url + ")");
            image_node.removeClass("mixtapeImage--empty u-ignoreBlock");
          }
          return _this.hide();
        };
      })(this));
    };

    Tooltip.prototype.getExtract = function(url) {
      return $.getJSON("" + this.current_editor.extract_url + url).done(function(data) {
        return utils.log(data);
      });
    };

    Tooltip.prototype.cleanOperationClasses = function(node) {
      return node.removeClass("is-embedable is-extractable");
    };

    Tooltip.prototype.hide = function() {
      $(this.el).hide();
      return $(this.el).removeClass("is-active is-scaled");
    };

    return Tooltip;

  })(Dante.View);

}).call(this);
(function() {
  var utils,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = Dante.utils;

  Dante.Editor.PopOver = (function(_super) {
    __extends(PopOver, _super);

    function PopOver() {
      return PopOver.__super__.constructor.apply(this, arguments);
    }

    PopOver.prototype.el = "body";

    PopOver.prototype.events = {
      "mouseover .popover": "cancelHide",
      "mouseout  .popover": "hide"
    };

    PopOver.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      utils.log("initialized popover");
      this.editor = opts.editor;
      this.hideTimeout;
      return this.settings = {
        timeout: 300
      };
    };

    PopOver.prototype.template = function() {
      return "<div class='popover popover--tooltip popover--Linktooltip popover--bottom is-active'> <div class='popover-inner'> <a href='#' target='_blank'> Link </a> </div> <div class='popover-arrow'> </div> </div>";
    };

    PopOver.prototype.displayAt = function(ev) {
      var offset, popover_w, pos, rect, target;
      this.cancelHide();
      target = $(ev.currentTarget);
      $(this.el).find(".popover-inner a").text(target.attr('href')).attr('href', target.attr("href"));
      pos = target.position();
      offset = target.offset();
      rect = ev.currentTarget.getBoundingClientRect();
      popover_w = $(this.el).find(".popover").width();
      utils.log(pos);
      utils.log(rect);
      utils.log(popover_w);
      $(this.el).find(".popover").css("top", pos.top + rect.height).css("left", pos.left + (rect.width / 2) - (popover_w / 2)).show();
      $(this.el).find(".popover--tooltip").css("pointer-events", "auto");
      return $(this.el).show();
    };

    PopOver.prototype.cancelHide = function() {
      utils.log("Cancel Hide");
      return clearTimeout(this.hideTimeout);
    };

    PopOver.prototype.hide = function(ev) {
      this.cancelHide();
      return this.hideTimeout = setTimeout((function(_this) {
        return function() {
          return $(_this.el).find(".popover").hide();
        };
      })(this), this.settings.timeout);
    };

    PopOver.prototype.render = function() {
      return $(this.template()).insertAfter(this.editor.$el);
    };

    return PopOver;

  })(Dante.View);

}).call(this);
(function() {
  var utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = Dante.utils;

  Dante.Editor.Menu = (function(_super) {
    __extends(Menu, _super);

    function Menu() {
      this.createlink = __bind(this.createlink, this);
      this.handleInputEnter = __bind(this.handleInputEnter, this);
      this.render = __bind(this.render, this);
      this.template = __bind(this.template, this);
      this.initialize = __bind(this.initialize, this);
      return Menu.__super__.constructor.apply(this, arguments);
    }

    Menu.prototype.el = "#dante-menu";

    Menu.prototype.events = {
      "mousedown li": "handleClick",
      "click .dante-menu-linkinput .dante-menu-button": "closeInput",
      "keypress input": "handleInputEnter"
    };

    Menu.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      this.config = opts.buttons || this.default_config();
      this.current_editor = opts.editor;
      this.commandsReg = {
        block: /^(?:p|h[1-6]|blockquote|pre)$/,
        inline: /^(?:bold|italic|underline|insertorderedlist|insertunorderedlist|indent|outdent)$/,
        source: /^(?:insertimage|createlink|unlink)$/,
        insert: /^(?:inserthorizontalrule|insert)$/,
        wrap: /^(?:code)$/
      };
      this.lineBreakReg = /^(?:blockquote|pre|div|p)$/i;
      this.effectNodeReg = /(?:[pubia]|h[1-6]|blockquote|[uo]l|li)/i;
      return this.strReg = {
        whiteSpace: /(^\s+)|(\s+$)/g,
        mailTo: /^(?!mailto:|.+\/|.+#|.+\?)(.*@.*\..+)$/,
        http: /^(?!\w+?:\/\/|mailto:|\/|\.\/|\?|#)(.*)$/
      };
    };

    Menu.prototype.default_config = function() {
      return {

        /*
        buttons: [
            'blockquote', 'h2', 'h3', 'p', 'code', 'insertorderedlist', 'insertunorderedlist', 'inserthorizontalrule',
            'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink'
          ]
         */
        buttons: ['bold', 'italic', 'h2', 'h3', 'h4', 'blockquote', 'createlink']
      };
    };

    Menu.prototype.template = function() {
      var html;
      html = "<div class='dante-menu-linkinput'><input class='dante-menu-input' placeholder='http://'><div class='dante-menu-button'>x</div></div>";
      html += "<ul class='dante-menu-buttons'>";
      _.each(this.config.buttons, function(item) {
        return html += "<li class='dante-menu-button'><i class=\"dante-icon icon-" + item + "\" data-action=\"" + item + "\"></i></li>";
      });
      html += "</ul>";
      return html;
    };

    Menu.prototype.render = function() {
      $(this.el).html(this.template());
      return this.show();
    };

    Menu.prototype.handleClick = function(ev) {
      var action, element, input;
      element = $(ev.currentTarget).find('.dante-icon');
      action = element.data("action");
      input = $(this.el).find("input.dante-menu-input");
      utils.log("menu " + action + " item clicked!");
      this.savedSel = utils.saveSelection();
      if (/(?:createlink)/.test(action)) {
        $(this.el).addClass("dante-menu--linkmode");
        input.focus();
      } else {
        this.menuApply(action);
      }
      return false;
    };

    Menu.prototype.closeInput = function(e) {
      $(this.el).removeClass("dante-menu--linkmode");
      return false;
    };

    Menu.prototype.handleInputEnter = function(e) {
      if (e.which === 13) {
        utils.restoreSelection(this.savedSel);
        return this.createlink($(e.target));
      }
    };

    Menu.prototype.createlink = function(input) {
      var action, inputValue;
      $(this.el).removeClass("dante-menu--linkmode");
      if (input.val()) {
        inputValue = input.val().replace(this.strReg.whiteSpace, "").replace(this.strReg.mailTo, "mailto:$1").replace(this.strReg.http, "http://$1");
        return this.menuApply("createlink", inputValue);
      }
      action = "unlink";
      return this.menuApply(action);
    };

    Menu.prototype.menuApply = function(action, value) {
      if (this.commandsReg.block.test(action)) {
        utils.log("block here");
        this.commandBlock(action);
      } else if (this.commandsReg.inline.test(action) || this.commandsReg.source.test(action)) {
        utils.log("overall here");
        this.commandOverall(action, value);
      } else if (this.commandsReg.insert.test(action)) {
        utils.log("insert here");
        this.commandInsert(action);
      } else if (this.commandsReg.wrap.test(action)) {
        utils.log("wrap here");
        this.commandWrap(action);
      } else {
        utils.log("can't find command function for action: " + action);
      }
      return false;
    };

    Menu.prototype.setupInsertedElement = function(element) {
      var n;
      n = this.current_editor.addClassesToElement(element);
      this.current_editor.setElementName(n);
      return this.current_editor.markAsSelected(n);
    };

    Menu.prototype.cleanContents = function() {
      return this.current_editor.cleanContents();
    };

    Menu.prototype.commandOverall = function(cmd, val) {
      var message, n;
      message = " to exec 「" + cmd + "」 command" + (val ? " with value: " + val : "");
      if (document.execCommand(cmd, false, val)) {
        utils.log("success" + message);
        n = this.current_editor.getNode();
        this.current_editor.setupLinks($(n).find("a"));
        this.displayHighlights();
        if ($(n).parent().hasClass("section-inner")) {
          n = this.current_editor.addClassesToElement(n);
          this.current_editor.setElementName(n);
        }
        this.current_editor.handleTextSelection(n);
      } else {
        utils.log("fail" + message, true);
      }
    };

    Menu.prototype.commandInsert = function(name) {
      var node;
      node = this.current_editor.current_node;
      if (!node) {
        return;
      }
      this.current_editor.current_range.selectNode(node);
      this.current_editor.current_range.collapse(false);
      return this.commandOverall(node, name);
    };

    Menu.prototype.commandBlock = function(name) {
      var list, node;
      node = this.current_editor.current_node;
      list = this.effectNode(this.current_editor.getNode(node), true);
      if (list.indexOf(name) !== -1) {
        name = "p";
      }
      return this.commandOverall("formatblock", name);
    };

    Menu.prototype.commandWrap = function(tag) {
      var node, val;
      node = this.current_editor.current_node;
      val = "<" + tag + ">" + selection + "</" + tag + ">";
      return this.commandOverall("insertHTML", val);
    };

    Menu.prototype.effectNode = function(el, returnAsNodeName) {
      var nodes;
      nodes = [];
      el = el || this.current_editor.$el[0];
      while (el !== this.current_editor.$el[0]) {
        if (el.nodeName.match(this.effectNodeReg)) {
          nodes.push((returnAsNodeName ? el.nodeName.toLowerCase() : el));
        }
        el = el.parentNode;
      }
      return nodes;
    };

    Menu.prototype.displayHighlights = function() {
      var nodes;
      $(this.el).find(".active").removeClass("active");
      nodes = this.effectNode(utils.getNode());
      utils.log(nodes);
      return _.each(nodes, (function(_this) {
        return function(node) {
          var tag;
          tag = node.nodeName.toLowerCase();
          switch (tag) {
            case "a":
              $(_this.el).find('input').val($(node).attr("href"));
              tag = "createlink";
              break;
            case "i":
              tag = "italic";
              break;
            case "u":
              tag = "underline";
              break;
            case "b":
              tag = "bold";
              break;
            case "code":
              tag = "code";
              break;
            case "ul":
              tag = "insertunorderedlist";
              break;
            case "ol":
              tag = "insertorderedlist";
              break;
            case "li":
              tag = "indent";
              utils.log("nothing to select");
          }
          if (tag.match(/(?:h[1-6])/i)) {
            $(_this.el).find(".icon-bold, .icon-italic, .icon-blockquote").parent("li").remove();
          }
          return _this.highlight(tag);
        };
      })(this));
    };

    Menu.prototype.highlight = function(tag) {
      return $(".icon-" + tag).parent("li").addClass("active");
    };

    Menu.prototype.show = function() {
      $(this.el).addClass("dante-menu--active");
      return this.displayHighlights();
    };

    Menu.prototype.hide = function() {
      return $(this.el).removeClass("dante-menu--active");
    };

    return Menu;

  })(Dante.View);

}).call(this);
//Editor components







;
