function extractMillis(timeElement) {
    var digits = timeElement.find('.digit').text().split('').map(digit => parseInt(digit))
    return 1000 * (60 * digits[0] + 10 * digits[1] + digits[2])
}

function getCountdownMillis() {
    $('.plan .time.running').removeClass('running')
    var timeElement = $('.plan .apnea.running .time').eq(0);
    timeElement.addClass('running')
    return extractMillis(timeElement)
}

function getStopwatchMillis() {
    $('.plan .time.running').removeClass('running')
    var timeElement = $('.plan .apnea.running .time').eq(1);
    timeElement.addClass('running')
    return extractMillis(timeElement)
}

function clearTimer() {
    console.log('CLEAR')
    timer && clearInterval(timer)

    $('#timer').text(formatMillis(0))
    $('.btn.btn-start').show()
    $('.btn.btn-continue').hide()
    $('.btn.btn-pause').hide()
    $('.btn.btn-clear').hide()
    $('.controls').show()
    $('.keyboard').show()

    $('.plan .running').removeClass('running')
    $('.plan .selected').removeClass('selected')
    $('.plan .apnea').eq(0).addClass('selected')
    $('.plan .digit').eq(0).addClass('selected')

    if (lastPlayedAudio && !lastPlayedAudio.ended) {
        lastPlayedAudio.pause()
    }
    lastPlayedAudio = undefined
}

function setParamsAndStartTimer() {
    timerFunction = countdownTick
    passedMillis = 0
    remainingMillis = getCountdownMillis()
    nextAudioIdx = audios.length - 1
    while (nextAudioIdx >= 0 && audios[nextAudioIdx].millis > remainingMillis) nextAudioIdx--
    lastPlayedAudio = undefined
    continueTimer()
}

function startTimer() {
    console.log('START')
    $('.plan .apnea').eq(0).addClass('running')
    $('.plan .selected').removeClass('selected')
    $('.keyboard').hide()
    setParamsAndStartTimer();
}

function continueTimer() {
    startedMillis = new Date().getTime()
    endMillis = startedMillis + remainingMillis
    console.log('CONTINUE for '+(endMillis-startedMillis))
    timer = setInterval(timerFunction, 100)
    $('.btn.btn-start').hide()
    $('.btn.btn-continue').hide()
    $('.btn.btn-pause').show()
    $('.btn.btn-clear').show()
    if (lastPlayedAudio && !lastPlayedAudio.ended) lastPlayedAudio.play()
}

function pauseTimer() {
    console.log('PAUSE')
    clearInterval(timer)
    var nowMillis = new Date().getTime()
    passedMillis += nowMillis - startedMillis
    remainingMillis -= nowMillis - startedMillis
    $('.btn.btn-start').hide()
    $('.btn.btn-continue').show()
    $('.btn.btn-pause').hide()
    $('.btn.btn-clear').show()
    if (lastPlayedAudio && !lastPlayedAudio.ended) lastPlayedAudio.pause()
}

function timeClick() {
    $('.plan .selected').removeClass('selected')
    $(this).addClass('selected')
    $(this).closest('.apnea').addClass('selected')
}

function removeApnea() {
    $('.plan .selected').removeClass('selected')
    $(this).closest('.apnea').addClass('selected')
    $(this).closest('.apnea').find('.digit').eq(0).addClass('selected')
    parseKey({key: 'Delete'})
}

function addApnea() {
    parseKey({key: 'End'})
    parseKey({key: 'ArrowDown'})
}

function digitClick() {
    parseKey({key: $(this).text().charCode(0)})
}

function digs(num) {
    num = num % 100
    return num > 9? num.toString(): '0'+num
}

function formatMillis(ms) {
    var mm = Math.trunc(ms / (1000 * 60))
    var ss = Math.trunc(ms % (1000 * 60) / 1000)
    var ts = Math.trunc(ms % 1000 / 100)
    return digs(mm) + ':' + digs(ss) + '.' + ts
}

function countdownTick() {
    var nowMillis = new Date().getTime()
    if (nowMillis > endMillis) {
        clearInterval(timer)
        console.log('COUNTDOWN -> STOPWATCH')
        timerFunction = stopwatchTick
        passedMillis = 0
        remainingMillis = getStopwatchMillis()
        continueTimer()
    } else {
        var publishMillis = endMillis - nowMillis;
        $('#timer').text(formatMillis(publishMillis))
        if (nextAudioIdx >= 0 && publishMillis < audios[nextAudioIdx].millis) {
            lastPlayedAudio = audios[nextAudioIdx--].audio
            lastPlayedAudio.load()
            lastPlayedAudio.play()
        }
    }
}

function stopwatchTick() {
    var nowMillis = new Date().getTime()
    $('#timer').text(formatMillis(passedMillis + nowMillis - startedMillis))
    if (nowMillis > endMillis) {
        clearInterval(timer)
        console.log('END')

        var nextRow = $('.plan .apnea.running').next('.apnea')
        $('.plan .apnea.running').removeClass('running')

        if (nextRow.length) {
            nextRow.addClass('running')
            setParamsAndStartTimer()
        } else {
            $('.btn.btn-start').hide()
            $('.btn.btn-continue').hide()
            $('.btn.btn-pause').hide()
            $('.btn.btn-clear').show()
        }
    }
}

function selectDigit(nextDigitFn) {
    var allDigits = $('.plan .digit')
    var digit = $('.plan .digit.selected')
    var nextDigit = nextDigitFn(allDigits, digit)
    if (nextDigit.length) {
        $('.plan .selected').removeClass('selected')
        nextDigit.addClass('selected')
        nextDigit.closest('.apnea').addClass('selected')
    }
}

function parseKey(event) {
    switch (event.key) {
        case ' ':
            $('.controls .btn-default:visible').click()
            break;
        case 'c':
        case 'C':
            $('.btn-clear:visible').click()
            break;
        case 'ArrowLeft':
            selectDigit((allDigits, digit) => allDigits.eq(Math.max(allDigits.index(digit) - 1, 0)))
            break;
        case 'ArrowRight':
            selectDigit((allDigits, digit) => allDigits.eq(allDigits.index(digit) + 1))
            break;
        case 'ArrowUp':
            selectDigit((allDigits, digit) => {
                var digitIndex = digit.closest('.apnea').find('.digit').index(digit)
                return digit.closest('.apnea').prev('.apnea').find('.digit').eq(digitIndex)
            })
            break;
        case 'ArrowDown':
            selectDigit((allDigits, digit) => {
                var thisRow = digit.closest('.apnea');
                var digitIndex = thisRow.find('.digit').index(digit)
                var nextRow = thisRow.next('.apnea');
                if (!nextRow.length) {
                    nextRow = thisRow.clone(true)
                    nextRow.insertAfter(thisRow)
                    digitIndex = 0
                }
                return nextRow.find('.digit').eq(digitIndex)
            })
            break;
        case 'Home':
            selectDigit((allDigits, digit) => allDigits.eq(0))
            break;
        case 'End':
            selectDigit((allDigits, digit) => allDigits.eq(allDigits.length - 1).closest('.apnea').find('.digit').eq(0))
            break;
        case '+':
        case 'Insert':
            addApnea()
            break;
        case '-':
        case 'Delete':
        case 'Backspace':
            selectDigit((allDigits, digit) => {
                var thisRow = digit.closest('.apnea');
                var nextRow = thisRow.next('.apnea');
                if (nextRow.length) {
                    var digitIndex = thisRow.find('.digit').index(digit)
                    thisRow.remove()
                    return nextRow.find('.digit').eq(digitIndex)
                } else
                    return digit
            })
            break;
        default:
            if (event.key >= '0' && event.key <= '9') {
                selectDigit((allDigits, digit) => {
                    digit.text(event.key)
                    return allDigits.eq(allDigits.index(digit) + 1)
                })
            }
            break;
    }
}

var audios

function prepareAudio() {
    audios = []
    $('audio').each((idx, audio) => {
        var digits = audio.id.substr(5).split('').map(digit => parseInt(digit))
        var millis = 1000 * (60 * (10 * digits[0] + digits[1]) + 10 * digits[2] + digits[3])
        audios.push({millis, audio})
        audio.load()
    })
}

var startedMillis
var endMillis
var passedMillis
var remainingMillis
var timer
var timerFunction
var lastPlayedAudio
var nextAudioIdx

$(() => {
    $('.btn-start').click(startTimer)
    $('.btn-continue').click(continueTimer)
    $('.btn-pause').click(pauseTimer)
    $('.btn-clear').click(clearTimer)
    $('.digit').click(timeClick)
    $('.btn-remove').click(removeApnea)
    $('.btn-add').click(addApnea)
    $('.btn-digit').click(digitClick)
    $(document).keydown(parseKey)

    prepareAudio()
    clearTimer()
})
