import * as yup from 'yup';
import { utils } from 'ethers';

const AddressSchema = yup.object().shape({
  address: yup.string().required()
});

const PoapEventSchema = yup.object().shape({
  year: yup
    .number()
    .required()
    .min(1990)
    .max(new Date().getFullYear() + 1),
  start_date: yup
    .string()
    .matches(/[0-9]{4}-[0-9]{2}-[0-9]{2}/, 'Date must be expressed in YYYY-MM-DD Format'),
  end_date: yup
    .string()
    .matches(/[0-9]{4}-[0-9]{2}-[0-9]{2}/, 'Date must be expressed in YYYY-MM-DD Format'),
  image_url: yup
    .string()
    .label('Image Url')
    .required()
    .url(),
  event_url: yup
    .string()
    .label('Website')
    .url(),
  signer_ip: yup
    .string()
    .label('Signer Url')
    .url()
    .nullable(),
  signer: yup
    .string()
    .test(
      'is-signer-an-address',
      'Must be a valid Ethereum Address',
      signer => {
        if (!signer) return true;
        return utils.isHexString(signer, 20);
      }
    )
    .nullable(),
});



const ClaimHashSchema = yup.object().shape({
  hash: yup
    .string()
    .required()
    .length(6),
});

export {
  AddressSchema,
  PoapEventSchema,
  ClaimHashSchema,
};
