var SS = {};
$(function () {
    "use strict";
    /*
     *******************************dataStore*******************************
     */
    //初始化数据仓库store
    HiWiFi.dataStore({
        client_info: {
            mac: ""
        },
        system_info: {
            os_uptime: 0,
            lan_ip: ""
        }
    });

    /*
     *******************************Interfaces*******************************
     */
    //获取路由器系统状态
    function getSystemInfo(muti_call) {
        //构造 读取数据类型 接口callback的处理对象
        var callback = HiWiFi.constructReadCallback(function (rsp, status, xhr) {
            rsp = rsp || {};
            xhr = xhr || {};
            var data = rsp.data || {};
            var uptime = data.uptime || 86400;
            uptime = Math.ceil(uptime / 86400);
            HiWiFi.dataStore.updateData("system_info", {
                os_uptime: uptime
            });

        }, function (e) {
            if (!muti_call) {
                //独自调用时，failed后重试
                HiWiFi.retry(getSystemInfo);
            }
        });

        var request_configs = {
            version: "v1"
        };
        return Openapi(muti_call).appendCall("wan.get_status", null, request_configs, callback);
    }
    //获取路由器lan端的状态
    function getLanStatus(muti_call) {
        //构造 读取数据类型 接口callback的处理对象
        var callback = HiWiFi.constructReadCallback(function (rsp) {
            rsp = rsp || {};
            var data = rsp.data || {};
            HiWiFi.dataStore.updateData("system_info", {
                lan_ip: data.lan_ipv4 || ""
            });

        }, function (e) {
            if (!muti_call) {
                //独自调用时，failed后重试
                HiWiFi.retry(getLanStatus);
            }
        });

        var request_configs = {
            version: "v1"
        };
        return Openapi(muti_call).appendCall("network.lan.get_lan_status", null, request_configs, callback);
    }

    //获取ClientInfo
    function getClientInfo() {
        HiWiFi.getRouterInfoFromLastRequest(function (data) {
            var client_info = {};
            if (data && data.app_data) {
                client_info = data.app_data || {};
                HiWiFi.dataStore.updateData("client_info", {
                    mac: HiWiFi.formatMacAddress(client_info.link_device_mac, true)
                });
            } else {
                setTimeout(function () {
                    getClientInfo();
                }, 1000);
            }
        });
    }

    //获取SS配置信息
    function getSSconfig() {
        $.post('easucks/ss', {'act': 'config'}, function(data){
            SS['config'] = data;
            if(! $.isEmptyObject(SS['config'])){
                // 填写各种值
                $('#ss_server_ipad').val(SS['config']['ss_server_ipad']);
                $('#ss_server_port').val(SS['config']['ss_server_port']);
                $('#ss_server_pass').val(SS['config']['ss_server_pass']);
                $('#ss_server_meth').val(SS['config']['ss_server_meth']);
                $('#ss_server_auth').val(SS['config']['ss_server_auth']);
                $('#ss_server_fsop').val(SS['config']['ss_server_fsop']);
                $('#ss_runnin_mode').val(SS['config']['ss_runnin_mode']);
                $('#ss_remote_dnss').val(SS['config']['ss_remote_dnss']);
                $('#ss_local_port').val(SS['config']['ss_local_port']);
                if (SS['config']['ss_server_auth'] == "true") {
                    $('#ss_server_auth').siblings("input").val("true");
                    $('#ss_server_auth').removeClass("off").addClass("on");
                }else{
                    $('#ss_server_auth').siblings("input").val("false");
                    $('#ss_server_auth').removeClass("on").addClass("off");
                }
                if (SS['config']['ss_server_fsop'] == "true") {
                    $('#ss_server_fsop').siblings("input").val("true");
                    $('#ss_server_fsop').removeClass("off").addClass("on");
                }else{
                    $('#ss_server_fsop').siblings("input").val("false");
                    $('#ss_server_fsop').removeClass("on").addClass("off");
                }
                HiWiFi.changeSelectToDiv();
            }
            $("#current_way").text('自定义模式');
        }, 'json');
    }

    //获取SS运行信息
    function getSSstatus() {
        $.post('easucks/ss', {'act': 'status'}, function(data){
            SS['status'] = data;

            if(data.ss_enabled == 'true'){
                $('#ss_auto_start').removeClass('off').addClass('on');
            }else{
                $('#ss_auto_start').removeClass('on').addClass('off');
            }

            if(data.ss_state == 'running'){
                $("#ss_status").children(':first').removeClass("icon-x").addClass("icon-j");
                $("#ss_status").children(':last').text(HiWiFi.i18n.prop("g_connected"));
                $('#ss_start').hide();
                $('#ss_stop').show();
                $('#ss_status_info').text(HiWiFi.i18n.prop("g_connected"));
                if(typeof(SS['config']) == 'object' && 'ss_runnin_mode' in SS['config'])
                    $("#ss_status").children(':last').text($('#ss_status').children(':last').text() + '(' + $("#ss_runnin_mode option[value='"+SS['config']['ss_runnin_mode']+"']").text() + ')');
            }else{
                $("#ss_status").children(':first').removeClass("icon-j").addClass("icon-x");
                $("#ss_status").children(':last').text(HiWiFi.i18n.prop("g_not_connected"));
                $('#ss_start').show();
                $('#ss_stop').hide();
                $('#ss_status_info').text(HiWiFi.i18n.prop("g_not_connected"));
            }

            //显示样式,去除loding
            $('#ss_stauts_area').children(':eq(0)').hide();
            $('#ss_stauts_area').children(':gt(0)').show();
        }, 'json');
    }

    //获取自定义域名列表
    function get_my_list() {
        $.post('easucks/ss', {'act': 'mylist'}, function(data){
            $('#domain_list_value').val(data);
        });
    }

    //获取过滤设备列表
    function get_mac_list() {
        $.post('easucks/ss', {'act': 'ignoremaclist'}, function(data){
            $('#mac_list_value').val(data);
        });
    }

    function initializationDatas() {
        var request_configs = {
            version: "v1",
            alias: "initializationDatas"
        };
        //获取 读取数据类型 接口callback的公共的默认处理对象
        var muti_call_callbacks = HiWiFi.constructReadCallback();
        muti_call_callbacks.requestError = function () {
            HiWiFi.retry(initializationDatas, arguments);
        };
        var muti_call = Openapi.mutiCall(request_configs, muti_call_callbacks);
        muti_call = getSystemInfo(muti_call);
        muti_call = getLanStatus(muti_call);
        muti_call.send();
        getClientInfo();
        getSSconfig();
        getSSstatus();
        get_my_list();
        get_mac_list();
    }

    /*
     *******************************Controller-Views*******************************
     * 页面展现逻辑
     * 缓存数据模型，展现页面内容
     */
    var controller_view = (function () {
        //拥有id为以下dom元素,只能显示一个(它们为每个子页面div的id)
        var views_id = ['main_view', 'ss_setup', 'ss_domain_list', 'ss_mac_list'];
        var controller_view = {
            setViewShow: function (id) {
                if (!id) {
                    return;
                }
                var show_id = HiWiFi.showElementById(id, views_id);
                if (show_id === "main_view") {
                    $(".J_system_restart").show();
                } else {
                    $(".J_system_restart").hide();
                }
                HiWiFi.initViewHeight();
                //初始化滚动条位置
                $(document).scrollTop(0);
                $(document).scrollLeft(0);
            },
            getViewIDByBtId: function (id) {
                var view_id = "";
                for (var i in views_id) {
                    if (views_id[i] + "_bt" === id) {
                        view_id = views_id[i];
                        return view_id;
                    }
                }
                return view_id;
            },
            initView: function () {
                var _self = this;
                //默认显示mode
                var current_hash = HiWiFi.getUrlHash("model") || "main_view";
                //显示样式,去除loding
                $("#loading_view").hide();
                $("#middle_part").show();
                controller_view.setViewShow(current_hash);
                HiWiFi.initViewHeight();
                $("#main_view").children("div").css("visibility", "visible");
                // setTimeout(function () {
                //     _self.doActionByViewId(current_hash);
                // }, 2000);
            },
            //折叠/展开 高级设置页面
            showAdvancedView: function (view_element, bt_element, is_show) {
                if (!view_element || !bt_element) {
                    return;
                }
                if ($(view_element).css('display') === "none" || is_show) {
                    $(view_element).slideDown("fast", function () {
                        HiWiFi.initViewHeight();
                    });
                    $(bt_element).children('span').removeClass("icon16").addClass("icon17");
                } else {
                    $(view_element).slideUp("fast", function () {
                        HiWiFi.initViewHeight();
                    });
                    $(bt_element).children('span').removeClass("icon17").addClass("icon16");
                }
            },
        };

        //绑定页面处理函数
        //被绑定的页面处理函数只能通过更新dataStore中的数据对象来触发函数的执行
        HiWiFi.dataStore.bindControllerViewFunction({
            showViewRightInfo: function () {
                var system_info = HiWiFi.dataStore.getData("system_info");

                var $days_num = $("#days_num");
                var $lan_ip = $("#lan_ip");
                var $view_right = $(".J_view_right");
                var os_uptime = system_info.os_uptime || 1;

                $days_num.html(os_uptime + "<span>" + HiWiFi.i18n.prop("g_day") + "</span>");
                if (system_info.lan_ip) {
                    $lan_ip.children(':last').html(HiWiFi.i18n.prop("web_lan_ip") + "：" + system_info.lan_ip);
                }
                //显示并隐藏loding
                $view_right.css("visibility", "visible");
                //初始化高度
                HiWiFi.initViewHeight();
            }
        });
        return controller_view;
    })();
    /*
     *******************************Actions*******************************
     */
    //初始化页面
    controller_view.initView();

    //初始化数据
    initializationDatas();

    //点击设备在线列表的右上角的返回按钮
    $(".go_back").on("click", function () {
        window.location.hash = "model=main_view";
        controller_view.initView();
        //初始化滚动条位置
        $(document).scrollTop(0);
        $(document).scrollLeft(0);
    });

    //高级设置
    $("#main_view").on("click", function (e) {
        var id = $(e.target).attr('id');
        if (!id) {
            return;
        }
        id = controller_view.getViewIDByBtId(id);
        window.location.hash = "model=" + id;
        // controller_view.doActionByViewId(id);
        controller_view.setViewShow(id);
    });

    //SS 高级设置
    $("#ss_advanced_setup_bt").on("click", function () {
        controller_view.showAdvancedView($("#ss_advanced_table"), $(this));
    });
 
    //自定义域名 提交表单
    $("#submit_domain_list").click(function (e) {
        var $bt = $(this);
        if ($bt.hasClass('disable')) {
            return;
        }
        $bt.addClass("disable");
        $bt.text(HiWiFi.i18n.prop("g_retaining"));
        var request_data = {
            'act':  'mylist_save',
            'list': $('#domain_list_value').val()
        };
        $.post('easucks/ss', request_data, function(data){
            HiWiFi.popDialog({
                type: "G-text",
                title: [HiWiFi.i18n.prop("g_set_success")],
                content: ""
            }).time(1500);
            $bt.removeClass("disable").text(HiWiFi.i18n.prop("g_save"));
        }, 'json');
    });

    //设备MAC过滤 提交表单
    $("#submit_mac_list").click(function (e) {
        var $bt = $(this);
        if ($bt.hasClass('disable')) {
            return;
        }
        $bt.addClass("disable");
        $bt.text(HiWiFi.i18n.prop("g_retaining"));
        var request_data = {
            'act':  'ignoremaclist_save',
            'list': $('#mac_list_value').val()
        };
        $.post('easucks/ss', request_data, function(data){
            HiWiFi.popDialog({
                type: "G-text",
                title: [HiWiFi.i18n.prop("g_set_success")],
                content: ""
            }).time(1500);
            $bt.removeClass("disable").text(HiWiFi.i18n.prop("g_save"));
        }, 'json');
    });

    //SS 提交表单
    $("#submit_ss").click(function (e) {
        var $bt = $(this);
        if ($bt.hasClass('disable')) {
            return;
        }
        $bt.addClass("disable");
        HiWiFi.formElementTrim($("#ss_setup form"), ["password", ""]);
        var $form = $("#ss_setup form");
        if (!$form.valid()) {
            $bt.removeClass("disable");
            return;
        }
        $bt.text(HiWiFi.i18n.prop("g_retaining"));
        var request_data = $form.serializeArray();
        request_data = HiWiFi.simplifyJSON(request_data);
        request_data['act'] = 'save';
        $.post('easucks/ss', request_data, function(data){
            HiWiFi.popDialog({
                type: "G-text",
                title: [HiWiFi.i18n.prop("g_set_success")],
                content: ""
            }).time(1500);
            $bt.removeClass("disable").text(HiWiFi.i18n.prop("g_save"));
        }, 'json');
    });

    //SS 启动按钮
    $("#ss_start").click(function (e) {
        var $bt = $(this);
        if ($bt.hasClass('disable')) {
            return;
        }
        $bt.addClass("disable");
        $bt.text(HiWiFi.i18n.prop("g_startting"));
        var request_data = {'act': 'start'};
        $.post('easucks/ss', request_data, function(data){
            getSSstatus();
            HiWiFi.popDialog({
                type: "G-text",
                title: data['state'] ? '启动成功' : '出错了!',
                content: ""
            }).time(1500);
            $bt.removeClass("disable").text(HiWiFi.i18n.prop("g_start"));
        }, 'json');
    });

    //SS 停止按钮
    $("#ss_stop").click(function (e) {
        var $bt = $(this);
        if ($bt.hasClass('disable')) {
            return;
        }
        $bt.addClass("disable");
        $bt.text(HiWiFi.i18n.prop("g_processing"));
        var request_data = {'act': 'stop'};
        $.post('easucks/ss', request_data, function(data){
            getSSstatus();
            HiWiFi.popDialog({
                type: "G-text",
                title: data['state'] ? '停止成功' : '出错了!',
                content: ""
            }).time(1500);
            $bt.removeClass("disable").text(HiWiFi.i18n.prop("g_stop"));
        }, 'json');
    });

    //SS 刷新按钮
    $("#ss_refresh").click(function (e) {
        var $bt = $(this);
        if ($bt.hasClass('disable')) {
            return;
        }
        $bt.addClass("disable");
        $bt.text(HiWiFi.i18n.prop("g_processing"));
        getSSconfig();
        getSSstatus();
        setTimeout(function(){$bt.removeClass("disable").text(HiWiFi.i18n.prop("g_refresh"));}, 3000);
    });

    //一次性验证和fastopen选项的按钮
    $("#ss_server_auth, #ss_server_fsop").click(function (e) {
        var $bt = $(this);
        var $input = $bt.siblings('input');
        if ($bt.hasClass("on")) {
            $bt.removeClass("on").addClass("off");
            $input.val('false');
        } else {
            $bt.removeClass("off").addClass("on");
            $input.val('true');
        }
    });

    //一次性验证开关的提示
    $("#ss_server_auth").next('span.J_Tip').hover(function () {
        var $tipPop = $('.J_ss_auth_tip_text');
        var $this = $(this),
            l = $this.offset().left - 15,
            t = $this.offset().top + 20;
        $tipPop.css({
            'left': l + 'px',
            'top': t + 'px'
        }).show();
    }, function () {
        $('.J_ss_auth_tip_text').hide();
    });

    //FASTOPEN开关的提示
    $("#ss_server_fsop").next('span.J_Tip').hover(function () {
        var $tipPop = $('.J_ss_fsop_tip_text');
        var $this = $(this),
            l = $this.offset().left - 15,
            t = $this.offset().top + 20;
        $tipPop.css({
            'left': l + 'px',
            'top': t + 'px'
        }).show();
    }, function () {
        $('.J_ss_fsop_tip_text').hide();
    });

    //启动停止刷新开关的提示
    $("#ss_status_info").siblings('span.J_Tip').hover(function () {
        var $tipPop = $('.J_ss_stat_tip_text');
        var $this = $(this),
            l = $this.offset().left - 15,
            t = $this.offset().top + 20;
        $tipPop.css({
            'left': l + 'px',
            'top': t + 'px'
        }).show();
    }, function () {
        $('.J_ss_stat_tip_text').hide();
    });

    //SS是否开机启动
    $("#ss_auto_start").on("click", function () {
        var $bt = $(this);
        if(! $bt.prop('disabled')){
            var request_data = {'act': 'service'};
            if ($bt.hasClass("on"))
                request_data['service'] = 'disable';
            else
                request_data['service'] = 'enable';

            $bt.prop('disabled', true);

            $.post('easucks/ss', request_data, function(data){
                if (data['ss_enabled'] == 'false') {
                    $bt.removeClass("on").addClass("off");
                }else{
                    $bt.removeClass("off").addClass("on");
                }
                $bt.prop('disabled', false);
            }, 'json');
        }
    });

    //自定义SS表单验证
    $("#ss_setup form").validate({
        errorElement: 'p',
        errorClass: 'error',
        ignore: "",
        showInputElementError: false,
        rules: {
            ss_server_ipad: {required: true, trimSapceAndIpcheck: true},
            ss_server_port: {required: true, positiveInteger: true},
            ss_server_pass: {required: true},
            ss_server_meth: {required: true},
            ss_runnin_mode: {required: true}
        },
        messages: {
            ss_server_ipad: {required: '请填写服务器地址'},
            ss_server_port: {required: '请填写服务器端口'},
            ss_server_pass: {required: '请填写SS通讯密码'},
            ss_server_meth: {required: '请选择SS加密算法'},
            ss_runnin_mode: {required: '请选择SS运行模式'}
        },
        errorPlacement: function (place, $element) {
            $element.parent().append(place);
        }
    });
});
