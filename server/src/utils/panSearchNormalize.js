function asString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function normalizeLink(link) {
  return {
    type: asString(link?.type),
    url: asString(link?.url),
    password: asString(link?.password),
    datetime: asString(link?.datetime),
    work_title: asString(link?.work_title),
  };
}

function normalizeResult(item) {
  const links = Array.isArray(item?.links)
    ? item.links.map((link) => normalizeLink(link)).filter((link) => link.url)
    : [];

  return {
    message_id: asString(item?.message_id),
    unique_id: asString(item?.unique_id),
    channel: asString(item?.channel),
    datetime: asString(item?.datetime),
    title: asString(item?.title),
    content: asString(item?.content),
    links,
    tags: asStringArray(item?.tags),
    images: asStringArray(item?.images),
  };
}

function normalizeMergedByType(source) {
  const input = source && typeof source === 'object' ? source : {};
  const output = {};

  for (const type of Object.keys(input)) {
    const rows = Array.isArray(input[type]) ? input[type] : [];
    output[type] = rows
      .map((row) => ({
        url: asString(row?.url),
        password: asString(row?.password),
        note: asString(row?.note),
        datetime: asString(row?.datetime),
        source: asString(row?.source),
        images: asStringArray(row?.images),
      }))
      .filter((row) => row.url);
  }

  return output;
}

function normalizePanSearchPayload(payload) {
  const root = payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
    ? payload.data
    : payload;

  let results = Array.isArray(root?.results)
    ? root.results.map((item) => normalizeResult(item))
    : [];

  let mergedByType = normalizeMergedByType(root?.merged_by_type);

  if (!Object.keys(mergedByType).length) {
    mergedByType = {};
    for (const result of results) {
      const source = result.channel ? `tg:${result.channel}` : '';
      for (const link of result.links || []) {
        const type = link.type || 'unknown';
        if (!mergedByType[type]) mergedByType[type] = [];
        mergedByType[type].push({
          url: asString(link.url),
          password: asString(link.password),
          note: asString(link.work_title || result.title),
          datetime: asString(link.datetime || result.datetime),
          source,
          images: asStringArray(result.images),
        });
      }
    }
  }

  if (!results.length && Object.keys(mergedByType).length) {
    const fallback = [];
    for (const type of Object.keys(mergedByType)) {
      const rows = Array.isArray(mergedByType[type]) ? mergedByType[type] : [];
      rows.forEach((row, idx) => {
        const source = asString(row?.source);
        const channel = source.startsWith('tg:') ? source.slice(3) : source;
        fallback.push({
          message_id: '',
          unique_id: `${type}-${idx}-${asString(row?.url).slice(-12)}`,
          channel,
          datetime: asString(row?.datetime),
          title: asString(row?.note) || `${type} 资源`,
          content: '',
          links: [
            {
              type,
              url: asString(row?.url),
              password: asString(row?.password),
              datetime: asString(row?.datetime),
              work_title: asString(row?.note),
            },
          ].filter((link) => link.url),
          tags: [],
          images: asStringArray(row?.images),
        });
      });
    }
    results = fallback;
  }

  return {
    total: Number(root?.total || results.length || 0),
    results,
    merged_by_type: mergedByType,
  };
}

module.exports = {
  asString,
  normalizePanSearchPayload,
};
