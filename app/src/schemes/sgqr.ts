export type SchemeSubTagDef = {
  id: string
  name: string
  description?: string
  required?: boolean
  constValue?: string
  options?: { value: string; label: string }[]
}

export type SchemeDef = {
  key: string
  label: string
  subTags: SchemeSubTagDef[]
}

// SGQR pre-defined schemes. Focus on PayNow first.
export const SGQR_SCHEMES: SchemeDef[] = [
  {
    key: 'paynow',
    label: 'PayNow',
    subTags: [
      { id: '00', name: 'Scheme identifier', constValue: 'SG.PAYNOW', required: true },
      { id: '01', name: 'Proxy type', required: true, 
        options: [
        { value: '0', label: '0: Mobile number (P2P)' },
        { value: '2', label: '1: UEN' },
        { value: '3', label: '2: VPA' }
      ]
    },
      { id: '02', name: 'Proxy value', required: true },
      { id: '03', name: 'Editable txn amount indicator', 
        options: [
          { value: '0', label: '0: Non-editable' },
          { value: '1', label: '1: can be edited' }
        ]
       },
      { id: '04', name: 'QR expiry date' },
      { id: '05', name: 'Merchant reference number' }
    ],
  },
  {
    key: 'fave',
    label: 'Fave',
    subTags: [
      { id: '00', name: 'Scheme identifier', constValue: 'com.myfave', required: true },
      { id: '01', name: 'Payload', required: true }
    ],
  },
]

export function getSchemeByKey(key?: string) {
  if (!key) return undefined
  return SGQR_SCHEMES.find((s) => s.key === key)
}
