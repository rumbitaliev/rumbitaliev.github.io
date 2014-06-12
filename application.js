$.extend( {
    findFirst: function( elems, validateCb ){
        var i;
        for( i=0 ; i < elems.length ; ++i ) {
            if( validateCb( i, elems[i]) )
                return elems[i];
        }
        return undefined;
    }
} );

//add qtip as validation notificator
jQuery.validator.setDefaults({
    success: function (error) {
        setTimeout(function () {
            $('#poll-form').find('.valid').qtip('destroy');
        }, 1);
    },
    errorPlacement: function(error, element) {
        var position = {
            at: 'right center',
            my: 'left center'
        };

        $(element).not('.valid').qtip({
            content: error,
            position: position,
            show: {
                event: false,
                ready: true
            },
            hide: false,
            style: {
                classes: 'qtip-red'
            }
        });
    }
});

//extend Date for date formating
Date.prototype.format = function(format) {
    var o = {
        "M+" : this.getMonth()+1, //month
        "d+" : this.getDate(),    //day
        "h+" : this.getHours(),   //hour
        "m+" : this.getMinutes(), //minute
        "s+" : this.getSeconds(), //second
        "q+" : Math.floor((this.getMonth()+3)/3),  //quarter
        "S" : this.getMilliseconds() //millisecond
    }

    if(/(y+)/.test(format)) format=format.replace(RegExp.$1,
            (this.getFullYear()+"").substr(4 - RegExp.$1.length));
    for(var k in o)if(new RegExp("("+ k +")").test(format))
        format = format.replace(RegExp.$1,
                RegExp.$1.length==1 ? o[k] :
                        ("00"+ o[k]).substr((""+ o[k]).length));
    return format;
}


var buttonNext = $("#poll-button-next");
var pollTitle = $("#poll-title");
var pollForm = $("#poll-form");


function renderPollQuestion(question) {
    pollTitle.text(question.title);
    pollForm.html("");

    var validationRules = [];
    if (typeof question.validates !== 'undefined') {
        if (question.validates.presence === true) {
            validationRules.push("data-rule-required='true'");
            buttonNext.addClass("pure-button-disabled");
        }
        else {
            buttonNext.removeClass("pure-button-disabled");
        }
        if (typeof question.validates.numericality !== 'undefined') {
            if (question.validates.numericality.only_integer === true) {
                validationRules.push("data-rule-digits='true'");
            }
            if (typeof question.validates.numericality.min !== 'undefined') {
                validationRules.push("data-rule-min='"+question.validates.numericality.min+"'");
            }
            if (typeof question.validates.numericality.max !== 'undefined') {
                validationRules.push("data-rule-max='"+question.validates.numericality.max+"'");
            }
        }
    }

    var validationData = validationRules.join(' ');
    var variants = undefined;
    if (question.variants !== undefined) {
        variants = question.variants.sort(function(a, b) { return a.position - b.position })
    }

    var defaultValue = question.value !== null ? question.value : "";

    switch (question.input) {
        case 'radio':
                $.each(variants, function(i, it) {
                    var checked = it.value == defaultValue ? "checked" : "";
                    pollForm.append('<label for="radio-option-'+it.position+'" class="pure-radio">'+
                            '<input id="radio-option-'+it.position+'" type="radio" name="radioOption" '+validationRules.join(' ')+' value="'+it.value+'" '+checked+'> '+
                            it.title+
                            '</label>');
                });
            break

        case "string":
                pollForm.append('<input id="input-string" type="text" '+validationRules.join(' ')+' value="'+defaultValue+'" autofocus>');
            break

        case "router":
                validationRules.push("data-rule-required='true'");
                buttonNext.addClass("pure-button-disabled");

                $.each(variants, function(i, it) {
                    var checked = it.value == defaultValue ? "checked" : "";
                    pollForm.append('<label for="router-option-'+it.position+'" class="pure-radio">'+
                            '<input id="router-option-'+it.position+'" type="radio" data-next="'+it.next+'" name="routerOption" '+validationRules.join(' ')+' value="'+it.value+'" '+checked+'> '+
                            it.title+
                            '</label>');
                });
            break

        case "checkbox":
                $.each(variants, function(i, it) {
                    pollForm.append('<label for="checkbox-option-'+it.position+'" class="pure-checkbox">'+
                            '<input id="checkbox-option-'+it.position+'" type="checkbox" name="checkboxOption-"'+it.position+' '+validationRules.join(' ')+' value="'+it.value+'"> '+
                            it.title+
                            '</label>');
                });
            break
        case "range":
                var select = $('<select id="selectOption" name="selectOption" />');
                for (i = question.min; i <= question.max; i++) {
                    $('<option />', {value: i, text: i}).appendTo(select);
                }
                if (defaultValue !== '') {
                    select.val(defaultValue);
                }
                pollForm.append(select);
            break
    }

    pollForm.validate();
    pollForm.find('input').on('change keyup', function () {
        if (pollForm.valid()) {
            buttonNext.removeClass("pure-button-disabled");
        } else {
            buttonNext.addClass("pure-button-disabled");
        }
    });
}


$.getJSON('poll-data.json', function(jsonData) {
    var questions = jsonData.questions;
    var firstQuestion = $.findFirst(questions, function(i, it) {
        return ( it.start === true)
    });
    if (firstQuestion === undefined) {
        //TODO: make custom error handler
        alert("Can't process pool data.");
    }

    var question = firstQuestion;
    renderPollQuestion(question);


    var answers = [];
    buttonNext.on('click', function() {
        if ($(this).hasClass('pure-button-disabled')) {
            return false;
        }

        if (question.finish === true) {
            $("#poll-poll").hide();
            $("#poll-finish").show();
            var result = {
                user: "p1f9oayieu109r691872y4oht2o809f8ya",
                date: new Date().format("yyyy-MM-dd hh:mm"),
                answers: answers
            }
            console.log(JSON.stringify(result));
            return false;
        }

        var next = question.next;
        if (next === null && question.input != 'router') {
            //TODO: make custom error handler
            alert("Poll flow structure is corrupted.");
            return false;
        }

        var answerValue = undefined;
        switch (question.input) {
            case 'radio':
                    answerValue = $('input[name=radioOption]:checked').val();
                break
            case "string":
                    answerValue = $('#input-string').val();
                break
            case "router":
                    var selectedItem = $('input[name=routerOption]:checked');
                    answerValue = selectedItem.val();
                    next = selectedItem.data('next');
                break
            case "checkbox":
                    answerValue = [];
                    $.each($("input[name^=checkboxOption-]:checked"), function(i, it) {
                        answerValue.push(it.value);
                    });
                break
            case "range":
                    answerValue = $("select[name=selectOption]").val()
                break
        }
        if (answerValue === undefined) { answerValue = null };
        answers.push({id: question.id, value: answerValue});
        question = $.findFirst(questions, function(i, it) {
            return ( it.id === next)
        });
        renderPollQuestion(question);
    });

})


