/**
 * @file
 * CKEDITOR plugin file.
 */

(function($) {

  CKEDITOR.plugins.add('nexteuropa_token_ckeditor', {
    init: function(editor) {

      CKEDITOR.dialog.add('nexteuropa_token_ckeditor_dialog', function() {
        return {
          title: Drupal.t('Insert internal links'),
          minWidth: 750,
          minHeight: 300,
          contents: [
            {
              id: 'info',
              label: Drupal.t('Insert internal links'),
              title: Drupal.t('Insert internal links'),
              elements: [
                {
                  id: 'nexteuropa_token_ckeditor',
                  type: 'html',
                  html: '<div class="nexteuropa-token-dialog-container"></div>'
                }
              ]
            }
          ],
          onShow: function () {
            // Get CKEditor object.
            var editor = this.getParentEditor();

            // Store current editor id. It will be refreshed every time a new dialog is open.
            Drupal.nexteuropa_token_ckeditor = Drupal.nexteuropa_token_ckeditor || {};
            Drupal.nexteuropa_token_ckeditor.current_editor_id = editor.id;

            if (!(editor.id in Drupal.nexteuropa_token_ckeditor)) {
              // Store editor reference in global Drupal object since it will be accessed from within
              // Drupal.behaviors.nexteuropa_token_ckeditor defined in nexteuropa_token_ckeditor.js.
              Drupal.nexteuropa_token_ckeditor[editor.id] = editor;

              // Get dialog container ID.
              var id = 'nexteuropa-token-' + editor.id + '-dialog-container';

              // Get dialog DOM object.
              var content = $(this.getElement('info', 'nexteuropa_token_ckeditor').$);
              $('.nexteuropa-token-dialog-container', content).attr('id', id);

              var ajax_settings = {
                url: Drupal.settings.basePath + 'nexteuropa/token-ckeditor/' + id,
                event: 'dialog.nexteuropa-token-ckeditor',
                method: 'html'
              };

              new Drupal.ajax(id, content[0], ajax_settings);
              content.trigger(ajax_settings.event);
            }
          },
          buttons: [{
            type: 'button',
            id: 'close',
            label: 'Close',
            title: 'Close',
            onClick: function(evt) {
              evt.data.dialog.hide();
            }
          }]
        };
      });

      // Register a command with CKeditor to launch the dialog box.
      editor.addCommand('NextEuropaTokenInsert', new CKEDITOR.dialogCommand('nexteuropa_token_ckeditor_dialog'));

      // Add a button to the CKeditor that executes a CKeditor command.
      editor.ui.addButton('NextEuropaToken', {
        label: Drupal.t('Insert internal links'),
        command: 'NextEuropaTokenInsert',
        icon: this.path + 'plugin.png'
      });

      // Add plugin CSS.
      editor.addContentsCss(this.path + 'plugin.css');

      // Define DTD rules for placeholder tag "nexteuropatoken".
      CKEDITOR.dtd['nexteuropatoken'] = CKEDITOR.dtd;
      CKEDITOR.dtd.$blockLimit['nexteuropatoken'] = true;
      CKEDITOR.dtd.$inline['nexteuropatoken'] = true;
      CKEDITOR.dtd.$nonEditable['nexteuropatoken'] = true;
      if (parseFloat(CKEDITOR.version) >= 4.1) {
        // Register allowed tag for advanced filtering.
        editor.filter.allow('nexteuropatoken[!*]', 'nexteuropatoken', true);
        // Objects should be selected as a whole in the editor.
        CKEDITOR.dtd.$object['nexteuropatoken'] = true;
      }

      // Ensure tokens instead the html element is saved.
      editor.on('setData', function(event) {
        var content = event.data.dataValue;
        event.data.dataValue = Drupal.nexteuropa_token_ckeditor.filter.replaceTokenWithPlaceholder(content);
      });

      // Replace tokens with WYSIWYG placeholders.
      editor.on('getData', function(event) {
        var content = event.data.dataValue;
        event.data.dataValue = Drupal.nexteuropa_token_ckeditor.filter.replacePlaceholderWithToken(content);
      });

      // Replace tokens with WYSIWYG placeholders.
      editor.on('insertHtml', function(event) {
        var content = event.data.dataValue;
        event.data.dataValue = Drupal.nexteuropa_token_ckeditor.filter.replaceTokenWithPlaceholder(content);
        // Close dialog
        CKEDITOR.dialog.getCurrent().hide();
      });
    }
  });

  // Utility class.
  Drupal.nexteuropa_token_ckeditor = Drupal.nexteuropa_token_ckeditor || {};
  Drupal.nexteuropa_token_ckeditor.filter = {

    /**
     * Regular expressions matching tokens exposed by NextEuropa Token module.
     */
    regex: {
      parse_token: /\[(\w*\:\d*\:(view-mode\:\w*|link))\]\{(.*)\}/,
      parse_placeholder: /<nexteuropatoken.*token="(.*?)".*>(.*)<\/nexteuropatoken>/,
      get_tokens: /\[\w*\:\d*\:(view-mode\:\w*|link)\]{.*?}/g,
      get_placeholders: /<nexteuropatoken.*?<\/nexteuropatoken>/g
    },

    /**
     * Get HTML placeholder give a token and a label.
     *
     * @param token
     *    Token string, followed by its label enclosed in curly brackets.
     *    For example: [node:1:view-mode:full]{Title}.
     *
     * @returns {string}
     */
    getPlaceholderFromToken: function(token) {
      var matches = token.match(this.regex.parse_token);
      return (matches) ? '<nexteuropatoken contenteditable="false" token="' + matches[1] + '">' + matches[3] + '</nexteuropatoken>' : '';
    },

    /**
     * Get token given an HTML placeholder.
     *
     * @param placeholder
     *    Placeholder string.
     *
     * @returns {string}
     */
    getTokenFromPlaceholder: function(placeholder) {
      var matches = placeholder.match(this.regex.parse_placeholder);
      return (matches) ? '[' + matches[1] + ']{' + matches[2] + '}' : '';
    },

    /**
     * Replaces tokens with placeholders.
     *
     * @param content
     *    Text coming from WYSIWYG.
     *
     * @returns {string}
     */
    replaceTokenWithPlaceholder: function(content) {
      var matches = content.match(this.regex.get_tokens);
      if (matches) {
        for (var i = 0; i < matches.length; i++) {
          content = content.replace(matches[i], this.getPlaceholderFromToken(matches[i]));
        }
      }
      return content;
    },

    /**
     * Replaces placeholders with tokens.
     *
     * @param content
     */
    replacePlaceholderWithToken: function(content) {
      var matches = content.match(this.regex.get_placeholders);
      if (matches) {
        for (var i = 0; i < matches.length; i++) {
          content = content.replace(matches[i], this.getTokenFromPlaceholder(matches[i]));
        }
      }
      return content;
    }
  };

})(jQuery);
