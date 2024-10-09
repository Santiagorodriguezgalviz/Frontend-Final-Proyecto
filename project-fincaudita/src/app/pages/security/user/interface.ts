// interface.ts
export interface DataTableSettingsCustom {
    pagingType?: string;
    pageLength?: number;
    processing?: boolean;
    searching?: boolean;
    ordering?: boolean;
    language?: {
      search?: string;
      lengthMenu?: string;
      info?: string;
      infoEmpty?: string;
      paginate?: {
        first?: string;
        last?: string;
        next?: string;
        previous?: string;
      };
    };
  }
  