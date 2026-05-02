const FORM_LABEL: Record<string, string> = {
  tablet: 'Tablet',
  capsule: 'Capsule',
  syrup: 'Syrup',
  suspension: 'Suspension',
  injection: 'Injection',
  cream: 'Cream',
  ointment: 'Ointment',
  drops: 'Drops',
  inhaler: 'Inhaler',
  patch: 'Patch',
  powder: 'Powder',
  sachet: 'Sachet',
  other: 'Other',
}

export function MedicineFormLabel({ form }: { form: string }) {
  return <span>{FORM_LABEL[form] ?? form}</span>
}

export const MEDICINE_FORMS = Object.entries(FORM_LABEL).map(([value, label]) => ({
  value,
  label,
}))
