UPDATE orthocare_clinic_documents
SET data = json_set(
  data,
  '$.address',
  'Main Road, Aggarwal Mandi Tatiri, Baghpat, Uttar Pradesh 250609',
  '$.openingHoursWeekday',
  'Monday – Friday: 9:00 AM – 8:00 PM; Saturday: 9:00 AM – 2:00 PM',
  '$.openingHoursSunday',
  'Sunday: Closed',
  '$.weeklyHours',
  json('[{"day":"monday","isClosed":false,"intervals":[{"open":"09:00","close":"20:00"}]},{"day":"tuesday","isClosed":false,"intervals":[{"open":"09:00","close":"20:00"}]},{"day":"wednesday","isClosed":false,"intervals":[{"open":"09:00","close":"20:00"}]},{"day":"thursday","isClosed":false,"intervals":[{"open":"09:00","close":"20:00"}]},{"day":"friday","isClosed":false,"intervals":[{"open":"09:00","close":"20:00"}]},{"day":"saturday","isClosed":false,"intervals":[{"open":"09:00","close":"14:00"}]},{"day":"sunday","isClosed":true,"intervals":[]}]')
)
WHERE document_key = 'settings'
  AND json_valid(data)
  AND json_extract(data, '$.openingHoursWeekday') =
    'Monday – Saturday: 9:00 AM – 1:30 PM & 4:30 PM – 8:00 PM'
  AND json_extract(data, '$.openingHoursSunday') =
    'Sunday: 10:00 AM – 1:00 PM (By Prior Appointment)'
  AND json_type(data, '$.weeklyHours') IS NULL;

UPDATE orthocare_clinic_documents
SET data = json_set(
  data,
  '$.address',
  'Main Road, Aggarwal Mandi Tatiri, Baghpat, Uttar Pradesh 250609'
)
WHERE document_key = 'settings'
  AND json_valid(data)
  AND json_extract(data, '$.address') =
    'Main Road, Aggarwal Mandi, Tatiri, Baghpat, Uttar Pradesh – 250609';
