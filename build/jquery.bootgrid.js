/*! 
 * jQuery Bootgrid v0.9.1-alpha - 05/08/2014
 * Copyright (c) 2014 Rafael Staib (http://www.jquery-bootgrid.com)
 * Licensed under MIT http://www.opensource.org/licenses/MIT
 */
;(function ($, undefined)
{
    "use strict";

    // GRID INTERNAL FIELDS    
    // ====================    
    
    var namespace = "rs.jquery.bootgrid";    
    
    // GRID INTERNAL FUNCTIONS    
    // =====================    
    
    function getFooterId(element)    
    {    
        return element._bgId() + "-footer";    
    }    
    
    function getHeaderId(element)    
    {    
        return element._bgId() + "-header";    
    }    
    
    function getRequest(options, state)    
    {    
        var request = {    
                current: state.current,    
                rowCount: options.rowCount,    
                sort: state.sort    
            },    
            post = options.post;    
    
        post = ($.isFunction(post)) ? post() : post;    
        return $.extend(true, request, post);    
    }    
    
    function getUrl(options)    
    {    
        var url = options.url;    
        return ($.isFunction(url)) ? url() : url;    
    }    
    
    function init(element, options, state)    
    {    
        loadColumns(element, options, state);    
        render(element, options, state);    
        // todo: support static data (no ajax)    
        loadData(element, options, state);    
    }    
    
    function loadColumns(element, options, state)    
    {    
        var firstHeadRow = element.find("thead > tr").first(),    
            sorted = false;    
        firstHeadRow.children().each(function()    
        {    
            var $this = $(this),    
                order = $this.data("order"),    
                sortable = $this.data("sortable"),    
                column = {    
                    id: $this.data("column-id"),    
                    order: (!sorted && (order === "asc" || order === "desc")) ? order : null,    
                    sortable: !(sortable === false ||  sortable === 0)    
                };    
            state.columns.push(column);    
            if (column.order != null)    
            {    
                state.sort[column.id] = column.order;    
            }    
    
            // ensures that only the first order will be applied in case of multi sorting is disabled    
            if (!options.multiSort && column.order !== null)    
            {    
                sorted = true;    
            }    
        });    
    }    
    
    /*    
    response = {    
        current: 1,    
        rowCount: 10,    
        rows: [{}, {}],    
        sort: [{ "columnId": "asc" }],    
        total: 101    
    }    
    */    
    
    function loadData(element, options, state)    
    {    
        var request = getRequest(options, state),    
            url = getUrl(options);    
        if (url == null || typeof url !== "string" || url.length === 0)    
        {    
            throw new Error("Url setting must be a none empty string or a function that returns one.");    
        }    
        options.events.loading();    
        // todo: show loading modal    
        $.post(url, request, function (response)    
        {    
            state.current = response.current;    
            state.total = response.total;    
            state.totalPages = Math.round(state.total / state.rowCount);    
    
            renderBody(element, options, state, response.rows);    
            renderPagination(element, options, state);    
            options.events.loaded();    
            // todo: hide loading modal    
        });    
    }    
    
    function render(element, options, state)    
    {    
        var css = options.css,    
            tpl = options.templates,    
            header = $(tpl.div.format(getHeaderId(element), css.header)),    
            footer = $(tpl.div.format(getFooterId(element), css.footer));    
    
        element.addClass(css.table).before(header).after(footer);    
        renderTableHeader(element, options, state);    
    }    
    
    function renderBody(element, options, state, rows)    
    {    
        var labels = options.labels,    
            tpl = options.templates,    
            tbody = element.children("tbody").first().empty();    
    
        if (rows.length > 0)    
        {    
            $.each(rows, function(i, row)    
            {    
                var tr = $(tpl.row);    
                $.each(state.columns, function(j, column)    
                {    
                    tr.append(tpl.cell.format(row[column.id]));    
                });    
                tbody.append(tr);    
            });    
        }    
        else    
        {    
            tbody.append(tpl.noResults.format(state.columns.length, labels.noResults));    
        }    
    }    
    
    function renderPagination(element, options, state)    
    {    
        var css = options.css,    
            tpl = options.templates,    
            current = state.current,    
            totalPages = state.totalPages,    
            list = $(tpl.list.format(css.pagination)),    
            offsetRight = totalPages - current,    
            offsetLeft = (options.padding - current) * -1,    
            startWith = ((offsetRight >= options.padding) ?     
                Math.max(offsetLeft, 1) :     
                Math.max((offsetLeft - options.padding + offsetRight), 1)),    
            maxCount = options.padding * 2 + 1,    
            count = (totalPages >= maxCount) ? maxCount : totalPages;    
    
        renderPaginationItem(element, options, state, list, "first", "&laquo;", "first")    
            ._bgEnableAria(current > 1);    
        renderPaginationItem(element, options, state, list, "prev", "&lt;", "prev")    
            ._bgEnableAria(current > 1);    
    
        for (var i = 0; i < count; i++)    
        {    
            var pos = i + startWith;    
            renderPaginationItem(element, options, state, list, pos, pos, "page-" + pos)    
                ._bgEnableAria()._bgSelectAria(pos === current);    
        }    
    
        renderPaginationItem(element, options, state, list, "next", "&gt;", "next")    
            ._bgEnableAria(totalPages > current);    
        renderPaginationItem(element, options, state, list, "last", "&raquo;", "last")    
            ._bgEnableAria(totalPages > current);    
    
        $("#" + getFooterId(element)).empty().append(list);    
        if (options.topPagination)    
        {    
            $("#" + getHeaderId(element)).empty().append(list.clone(true));    
        }    
    }    
    
    function renderPaginationItem(element, options, state, list, uri, text, css)    
    {    
        var tpl = options.templates,    
            anchor = $(tpl.anchor.format("#" + uri, text))    
                .on("click." + namespace, function (e)    
                {    
                    e.preventDefault();    
                    var $this = $(this);    
                    if (!$this.parent().hasClass("disabled"))    
                    {    
                        var commandList = {    
                            first: 1,    
                            prev: state.current - 1,    
                            next: state.current + 1,    
                            last: state.totalPages    
                        };    
                        var command = $this.attr("href").substr(1);    
                        state.current = commandList[command] || +command; // + converts string to int    
                        // todo: support static data (no ajax)    
                        loadData(element, options, state);    
                    }    
                }),    
            listItem = $(tpl.listItem).addClass(css).append(anchor);    
    
        list.append(listItem);    
        return listItem;    
    }    
    
    function renderTableHeader(element, options, state)    
    {    
        var columns = element.find("thead > tr > th"),    
            css = options.css,    
            tpl = options.templates;    
        $.each(state.columns, function(index, column)    
        {    
            if (column.sortable)    
            {    
                var sort = state.sort[column.id],    
                    iconCss = css.icon +     
                        ((sort && sort === "asc") ? " " + css.iconDown :     
                            (sort && sort === "desc") ? " " + css.iconUp : "");    
                columns.eq(index).addClass(css.sortable).append(" " + tpl.icon.format(iconCss))    
                    .on("click." + namespace, function(e)    
                    {    
                        e.preventDefault();    
                        var $this = $(this),     
                            $sort = state.sort[column.id],    
                            $icon = $this.find("." + css.icon);    
    
                        if (!options.multiSort)    
                        {    
                            columns.find("." + css.icon).removeClass(css.iconDown + " " + css.iconUp);    
                            state.sort = {};    
                        }    
    
                        if ($sort && $sort === "asc")    
                        {    
                            state.sort[column.id] = "desc";    
                            $icon.removeClass(css.iconDown).addClass(css.iconUp);    
                        }    
                        else if ($sort && $sort === "desc")    
                        {    
                            delete state.sort[column.id];    
                            $icon.removeClass(css.iconUp);    
                        }    
                        else    
                        {    
                            state.sort[column.id] = "asc";    
                            $icon.addClass(css.iconDown);    
                        }    
    
                        // todo: support static data (no ajax)    
                        loadData(element, options, state);    
                    });    
            }    
        });    
    }

    // GRID PUBLIC CLASS DEFINITION    
    // ====================    
    
    var Grid = function(element, options)    
    {    
        this.element = $(element);    
        this.options = $.extend(true, {}, Grid.defaults, this.element.data(), options);    
        this.state = {    
            columns: [],    
            current: 1,    
            rowCount: this.options.rowCount,    
            sort: {},    
            total: 0,    
            totalPages: 0    
        };    
    
        init(this.element, this.options, this.state);    
    };    
    
    Grid.defaults = {    
        post: {},     // or use function () { return {}; }    
        padding: 2,   // page padding (pagination)    
        rowCount: 10, // rows per page    
        url: "",      // or use function () { return ""; }    
        topPagination: false,    
        multiSort: false,    
        // todo: implement cache    
    
        // note: The following properties are not available via data-api attributes    
        css: {    
            footer: "bootgrid-footer",    
            icon: "glyphicon",    
            iconDown: "glyphicon-chevron-down",    
            iconUp: "glyphicon-chevron-up",    
            pagination: "pagination",    
            header: "bootgrid-header",    
            sortable: "sortable",    
            table: "bootgrid-table table"    
        },    
        events: {    
            loaded: function () { },    
            loading: function () { }    
        },    
        labels: {    
            loading: "Loading...",    
            noResults: "No results found!"    
        },    
        templates: {    
            anchor: "<a href=\"{0}\">{1}</a>",    
            cell: "<td>{0}</td>",    
            div: "<div id=\"{0}\" class=\"{1}\"></div>",    
            icon: "<span class=\"{0}\"></span>",    
            list: "<ul class=\"{0}\"></ul>",    
            listItem: "<li></li>",    
            noResults: "<tr><td colspan=\"{0}\" class=\"no-results\">{1}</td></tr>",    
            row: "<tr>{0}</tr>"    
        }    
    };    
    
    Grid.prototype.destroy = function()    
    {    
        this.element.off(namespace).removeData(namespace);    
    };    
    
    Grid.prototype.reload = function()    
    {    
        this.state.current = 1; // reset    
        // todo: support static data (no ajax)    
        loadData(this.element, this.options, this.state);    
    };    
    
    Grid.prototype.sort = function(dictionary)    
    {    
        var values = (dictionary) ? $.extend({}, dictionary) : {};    
        if (values === this.state.sort)    
        {    
            return this;    
        }    
    
        this.state.sort = values;    
    
        $.each(values, function(field, direction)    
        {    
            // todo: Implement rendering    
        });    
    
        // todo: Show loading    
        // todo: Execute post    
    
        return this;    
    };

    // GRID PLUGIN DEFINITION    
    // =====================    
    
    var old = $.fn.bootgrid;    
    
    $.fn.bootgrid = function (option)    
    {    
        return this.each(function ()    
        {    
            var $this = $(this),    
                data = $this.data(namespace),    
                options = typeof option === "object" && option;    
    
            if (!data && option === "destroy")    
            {    
                return;    
            }    
            if (!data)    
            {    
                $this.data(namespace, (data = new Grid(this, options)));    
            }    
            if (typeof option === "string")    
            {    
                return data[option]();    
            }    
        });    
    };    
    
    $.fn.bootgrid.Constructor = Grid;    
    
    // GRID NO CONFLICT    
    // ===============    
    
    $.fn.bootgrid.noConflict = function ()    
    {    
        $.fn.bootgrid = old;    
        return this;    
    };    
    
    // GRID DATA-API    
    // ============    
    
    /*    
    $(document).on("click." + namespace + ".data-api", "[data-toggle=\"bootgrid\"]", function(e)    
    {    
        e.preventDefault();    
        $(this).bootgrid("show");    
    });    
    */

    // GRID COMMON TYPE EXTENSIONS    
    // ============    
    
    $.fn.extend({    
        _bgAria: function (name, value)    
        {    
            return this.attr("aria-" + name, value);    
        },    
    
        _bgRemoveAria: function (name)    
        {    
            return this.removeAttr("aria-" + name);    
        },    
    
        _bgEnableAria: function (enable)    
        {    
            return (enable == null || enable) ?     
                this.removeClass("disabled")._bgAria("disabled", "false") :     
                this.addClass("disabled")._bgAria("disabled", "true");    
        },    
    
        _bgShowAria: function (show)    
        {    
            return (show == null || show) ?     
                this.show()._bgAria("hidden", "false") :    
                this.hide()._bgAria("hidden", "true");    
        },    
    
        _bgSelectAria: function (select)    
        {    
            return (select == null || select) ?     
                this.addClass("active")._bgAria("selected", "true") :     
                this.removeClass("active")._bgAria("selected", "false");    
        },    
    
        _bgId: function (id)    
        {    
            return (id) ? this.attr("id", id) : this.attr("id");    
        }    
    });    
    
    if (!String.prototype.format)    
    {    
        String.prototype.format = function (stringValues)    
        {    
            var formattedString = this;    
            for (var i = 0; i < arguments.length; i++)    
            {    
                var pattern = new RegExp("\\{" + i + "\\}", "gm");    
                formattedString = formattedString.replace(pattern, arguments[i]);    
            }    
            return formattedString;    
        };    
    }
})(jQuery);