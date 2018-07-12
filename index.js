var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var crypto = require("crypto");
var async = require('async');

app.set('port', (process.env.PORT || 8000));
// JSON�̑��M������
app.use(bodyParser.urlencoded({
    extended: true
}));
// JSON�̃p�[�X���y�Ɂi��M���j
app.use(bodyParser.json());

app.post('/callback', function(req, res) {
    async.waterfall([
            function(callback) {
                // ���N�G�X�g��LINE Platform���瑗���Ă������m�F����
                if (!validate_signature(req.headers['x-line-signature'], req.body)) {
                    return;
                }
                // �e�L�X�g�������Ă����ꍇ�̂ݕԎ�������
                if ((req.body['events'][0]['type'] != 'message') || (req.body['events'][0]['message']['type'] != 'text')) {
                    return;
                }
                // �u��������v�Ƃ����P�ꂪ�e�L�X�g�Ɋ܂܂�Ă���ꍇ�̂ݕԎ�������
                if (req.body['events'][0]['message']['text'].indexOf('��������') == -1) {
                    return;
                }

                // 1��1�̃`���b�g�̏ꍇ�͑���̃��[�U���ŕԎ�������
                // �O���[�v�`���b�g�̏ꍇ�̓��[�U����������Ȃ��̂ŁA�u�M�l��v�ŕԎ�������
                if (req.body['events'][0]['source']['type'] == 'user') {
                    // ���[�UID��LINE�̃v���t�@�C�����������āA���[�U�����擾����
                    var user_id = req.body['events'][0]['source']['userId'];
                    var get_profile_options = {
                        url: 'https://api.line.me/v2/bot/profile/' + user_id,
                        proxy: process.env.FIXIE_URL,
                        json: true,
                        headers: {
                            'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}'
                        }
                    };
                    request.get(get_profile_options, function(error, response, body) {
                        if (!error && response.statusCode == 200) {
                            callback(body['displayName']);
                        }
                    });
                } else if ('room' == req.body['events'][0]['source']['type']) {
                    callback('�M�l��');
                }
            },
        ],
        function(displayName) {
            //�w�b�_�[���`
            var headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
            };

            // ���M�f�[�^�쐬
            var data = {
                'replyToken': req.body['events'][0]['replyToken'],
                "messages": [{
                    "type": "text",
                    "text": displayName + '�ɂ���ȐJ�߂��󂯂�Ƃ�...�I\n����...�E���I'
                }]
            };

            //�I�v�V�������`
            var options = {
                url: 'https://api.line.me/v2/bot/message/reply',
                proxy: process.env.FIXIE_URL,
                headers: headers,
                json: true,
                body: data
            };

            request.post(options, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(body);
                } else {
                    console.log('error: ' + JSON.stringify(response));
                }
            });
        }
    );
});

app.listen(app.get('port'), function() {
    console.log('Node app is running');
});

// ��������
function validate_signature(signature, body) {
    return signature == crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET).update(new Buffer(JSON.stringify(body), 'utf8')).digest('base64');
}