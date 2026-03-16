alter table if exists hosts
  drop constraint if exists hosts_referred_by_host_id_fkey;
