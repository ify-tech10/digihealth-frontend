import { rmApi } from '../../Api/rmApi';

/*
 * Onboarding form for each facility type. Field keys are the exact payload keys
 * the working HTML RM dashboard sent to the backend.
 *
 * type: text | email | tel | number | select | textarea | list | checks
 *   list   -> comma-separated input, sent as an array
 *   checks -> checkboxes, sent as an array of the checked values
 */
const common = {
  address: { key: 'address', label: 'Address', required: true, full: true, placeholder: 'Full street address' },
  areaLga: { key: 'areaLga', label: 'Area / LGA', required: true, area: true, placeholder: 'e.g. Victoria Island' },
  phoneNumber: { key: 'phoneNumber', label: 'Phone', type: 'tel', required: true, placeholder: '+234 XXX XXX XXXX' },
  email: { key: 'email', label: 'Email', type: 'email' },
  status: { key: 'status', label: 'Status', type: 'select', options: [['active', 'Active'], ['inactive', 'Inactive']], initial: 'active' },
  notes: { key: 'notes', label: 'Notes', type: 'textarea', full: true },
};

export const FACILITY_FORMS = {
  HOSPITAL: {
    title: 'Hospital',
    nameKey: 'hospitalName',
    create: rmApi.createHospital,
    fields: [
      { key: 'hospitalName', label: 'Hospital name', required: true, full: true, placeholder: 'e.g. Lagos Island General Hospital' },
      { key: 'type', label: 'Type', type: 'select', required: true, options: [['Government', 'Government'], ['Private', 'Private'], ['Teaching', 'Teaching']] },
      common.status,
      common.address,
      common.areaLga,
      common.phoneNumber,
      common.email,
      { key: 'contactPerson', label: 'Contact person', placeholder: 'Name of liaison' },
      { key: 'bedCapacity', label: 'Bed capacity', type: 'number', placeholder: 'e.g. 200' },
      { key: 'emergencyUnit', label: 'Emergency unit', type: 'select', options: [['YES_24_7', 'Yes — 24/7'], ['No', 'No']], initial: 'YES_24_7' },
      { key: 'specialisations', label: 'Specialisations / services', type: 'list', full: true, placeholder: 'e.g. Cardiology, Maternity, Orthopaedics (comma separated)' },
      common.notes,
    ],
  },
  PHARMACY: {
    title: 'Pharmacy',
    nameKey: 'pharmacyName',
    create: rmApi.createPharmacy,
    fields: [
      { key: 'pharmacyName', label: 'Pharmacy name', required: true, full: true, placeholder: 'e.g. MedPlus Pharmacy — VI Branch' },
      { key: 'chainBrand', label: 'Chain / brand', placeholder: 'e.g. MedPlus, HealthPlus' },
      common.status,
      common.address,
      common.areaLga,
      common.phoneNumber,
      common.email,
      { key: 'contactPerson', label: 'Contact person', placeholder: 'Pharmacist in charge' },
      { key: 'openingHours', label: 'Opening hours', placeholder: 'e.g. 8AM – 10PM' },
      { key: 'nafdacRegNo', label: 'NAFDAC / PCN reg. no.', required: true, placeholder: 'e.g. PCN/0001/2025' },
      {
        key: 'servicesOffered', label: 'Services offered', type: 'checks', full: true,
        options: ['24hr', 'Home Delivery', 'Compounding', 'Vaccinations', 'Pharmacist Consultation', 'Generic Medicines'],
        optionLabels: { '24hr': 'Open 24 hours' },
      },
      common.notes,
    ],
  },
  LAB: {
    title: 'Laboratory',
    nameKey: 'laboratoryName',
    create: rmApi.createLaboratory,
    fields: [
      { key: 'laboratoryName', label: 'Laboratory name', required: true, full: true, placeholder: 'e.g. Clina-Lancet Laboratories — VI' },
      { key: 'typeChain', label: 'Type / chain', placeholder: 'e.g. Synlab, Independent' },
      { key: 'accreditationBody', label: 'Accreditation', placeholder: 'e.g. MLSCN, ISO 15189' },
      common.address,
      common.areaLga,
      common.phoneNumber,
      common.email,
      { key: 'contactLabManager', label: 'Lab manager', placeholder: 'Name of lab manager' },
      { key: 'openingHours', label: 'Opening hours', placeholder: 'e.g. Mon–Sat 7AM – 6PM' },
      { key: 'turnaroundTime', label: 'Turnaround time', placeholder: 'e.g. Same day / 24hrs' },
      common.status,
      {
        key: 'resultDelivery', label: 'Result delivery', type: 'select', initial: 'Online Portal',
        options: [['Online Portal', 'Online portal'], ['WhatsApp / Email', 'WhatsApp / Email'], ['Physical Pickup', 'Physical pickup'], ['All Methods', 'All methods']],
      },
      {
        key: 'servicesOffered', label: 'Services & capabilities', type: 'checks', full: true,
        options: ['Home Sample Pickup', 'Same-Day Results', 'Digital Reports', 'COVID Testing', 'Genetic Testing', 'Microbiology', 'Histopathology', 'Hormone Panels', 'Imaging (X-ray/Scan)', 'Corporate Packages'],
      },
      { key: 'testsOffered', label: 'Key tests offered', type: 'list', full: true, placeholder: 'e.g. Full Blood Count, HbA1c, Liver Panel (comma separated)' },
      common.notes,
    ],
  },
};
