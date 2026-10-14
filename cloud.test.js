import test from 'node:test';
import assert from 'node:assert/strict';
import {friendly} from './cloud.js';
test('cadastro distingue limite de e-mail, SMTP, confirmação e erro de perfil',()=>{assert.match(friendly({error_code:'over_email_send_rate_limit'},429),/limite de e-mails/);assert.match(friendly({code:'email_address_not_authorized'},400),/SMTP/);assert.match(friendly({code:'email_not_confirmed'},400),/Confirme seu e-mail/);assert.match(friendly({code:'unexpected_failure',msg:'Database error saving new user'},500),/criar seu perfil/);});
test('erro desconhecido mostra referência sem expor conteúdo bruto do serviço',()=>{assert.match(friendly({code:'unexpected_failure',message:'sensitive contents'},500),/unexpected_failure/);assert.ok(!friendly({message:'sensitive contents'},500).includes('sensitive contents'));assert.match(friendly({},502),/HTTP 502/);});
