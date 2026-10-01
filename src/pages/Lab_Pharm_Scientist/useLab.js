import { useMemo } from 'react';
import { useAuth } from '../../context/useAuth';
import { labApi } from '../../Api/labApi';
import { WORDS, kindOf } from './labFields';

/* The signed-in user's side of the portal: LAB or PHARMACY, its wording and endpoints. */
export function useLab() {
  const { user } = useAuth();
  const kind = kindOf(user?.role);
  const api = useMemo(() => labApi(kind), [kind]);
  return { kind, words: WORDS[kind], api, user };
}
