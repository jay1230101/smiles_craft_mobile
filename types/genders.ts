export type Gender = {
  id: number;
  gen: string;
};

export type GetGendersResponse = {
  type: Gender[];
  status: number;
};
