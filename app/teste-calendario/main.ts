// Q-09 phone test page. Temporary and Portuguese-only (it is for the family testers), so it
// sits outside the i18n app. The .ics code under test is the real module in src/calendar.
import {
  addDays,
  buildIcs,
  googleCalendarUrl,
  toIsoDate,
  type IcsEvent,
} from '../src/calendar/ics.ts';
import { TEST_FEED_PATH } from './feed.ts';
import './style.css';

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};

const longDate = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const showDate = (iso: string) => longDate.format(new Date(`${iso}T12:00:00`));

// --- 1. Reminder event: in 6 days, alarm 5 days before at 13:00 (i.e. tomorrow) ---
const today = toIsoDate(new Date());
const event: IcsEvent = {
  uid: `teste-${Date.now()}@lunario`,
  title: 'Transplantar alfaces (teste Lunário)',
  date: addDays(today, 6),
  description: 'Evento de teste do Lunário. Pode apagá-lo depois do teste.',
  alarm: { daysBefore: 5, time: '13:00' },
};

$('event-title').textContent = event.title;
$('event-date').textContent = showDate(event.date);
$('reminder-date').textContent = `${showDate(addDays(event.date, -5))} às 13:00`;

const icsFile = () =>
  new File([buildIcs({ events: [event] })], 'transplantar-alfaces.ics', {
    type: 'text/calendar',
  });

$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(icsFile());
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transplantar-alfaces.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
});

$('open').addEventListener('click', () => {
  window.location.href = URL.createObjectURL(icsFile());
});

if (navigator.canShare?.({ files: [icsFile()] })) {
  $('share').addEventListener('click', () => {
    navigator.share({ files: [icsFile()], title: event.title }).catch(() => undefined);
  });
} else {
  $('share').setAttribute('disabled', '');
  $('share-block').append(
    Object.assign(document.createElement('p'), {
      className: 'hint',
      textContent: 'Este navegador não permite partilhar ficheiros. Marque “Não deu para tentar”.',
    }),
  );
}

$<HTMLAnchorElement>('google-add').href = googleCalendarUrl(event);

// --- 2. Regional feed subscription ---
const feedHttps = `${location.origin}/${TEST_FEED_PATH}`;
const feedWebcal = `webcal://${location.host}/${TEST_FEED_PATH}`;
$<HTMLAnchorElement>('webcal').href = feedWebcal;
$<HTMLAnchorElement>('google-subscribe').href =
  `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedWebcal)}`;

const status = $('status');
async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = done;
  } catch {
    status.textContent = 'Não foi possível copiar. Selecione e copie o texto à mão:';
    status.append(Object.assign(document.createElement('pre'), { textContent: text }));
  }
}
$('copy-feed').addEventListener('click', () => void copy(feedHttps, 'Endereço copiado.'));

// --- 3. Results ---
const OUTCOMES = [
  ['ok', 'Funcionou'],
  ['extra', 'Funcionou, mas com passos extra'],
  ['fail', 'Não funcionou'],
  ['skip', 'Não deu para tentar'],
] as const;

const tests = [...document.querySelectorAll<HTMLElement>('.test')];
for (const test of tests) {
  const id = test.dataset.test ?? '';
  const fieldset = document.createElement('fieldset');
  fieldset.innerHTML = `<legend>Resultado</legend>`;
  for (const [value, label] of OUTCOMES) {
    const input = Object.assign(document.createElement('input'), {
      type: 'radio',
      name: `result-${id}`,
      value,
    });
    const wrapper = document.createElement('label');
    wrapper.className = 'choice';
    wrapper.append(input, ` ${label}`);
    fieldset.append(wrapper);
  }
  test.append(fieldset);
}

function resultsText(): string {
  const value = (id: string) => $<HTMLInputElement | HTMLSelectElement>(id).value.trim();
  const lines = [
    'Lunário · teste do calendário',
    `Calendário: ${value('calendar-app') || '?'}`,
    `Telemóvel: ${value('phone') || '?'}`,
    `Navegador: ${navigator.userAgent}`,
    '',
  ];
  for (const test of tests) {
    const id = test.dataset.test ?? '';
    const checked = test.querySelector<HTMLInputElement>(`input[name="result-${id}"]:checked`);
    const outcome = OUTCOMES.find(([v]) => v === checked?.value)?.[1] ?? '—';
    lines.push(`${id} ${test.dataset.label}: ${outcome}`);
  }
  const notes = value('notes');
  if (notes) lines.push('', `Notas: ${notes}`);
  return lines.join('\n');
}

$('copy-results').addEventListener(
  'click',
  () => void copy(resultsText(), 'Resultados copiados. Cole-os numa mensagem ao Pedro.'),
);

if (typeof navigator.share === 'function') {
  $('share-results').addEventListener('click', () => {
    navigator.share({ text: resultsText() }).catch(() => undefined);
  });
} else {
  $('share-results').hidden = true;
}
