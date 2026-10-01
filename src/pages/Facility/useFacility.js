import { useAuth } from '../../context/useAuth';
import { facilityApi } from '../../Api/facilityApi';
import { WORDS, kindOf } from './facilityFields';

/* HOSPITAL, PHARMACY or LAB for the signed-in facility admin, with its wording. */
export function useFacility() {
  const { user } = useAuth();
  const kind = kindOf(user?.role);
  return { kind, words: WORDS[kind], api: facilityApi, user };
}
