import { NextResponse } from "next/server";

const BASE = process.env.BUBBLE_BASE_URL!;
const KEY = process.env.BUBBLE_API_KEY!;

function enc(value: string) {
  return encodeURIComponent(value);
}

function constraints(value: unknown) {
  return encodeURIComponent(JSON.stringify(value));
}

function normAgfName(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MESES: Record<string, number> = {
  "1": 1,
  "01": 1,
  jan: 1,
  janeiro: 1,
  "2": 2,
  "02": 2,
  fev: 2,
  fevereiro: 2,
  "3": 3,
  "03": 3,
  mar: 3,
  marco: 3,
  "4": 4,
  "04": 4,
  abr: 4,
  abril: 4,
  "5": 5,
  "05": 5,
  mai: 5,
  maio: 5,
  "6": 6,
  "06": 6,
  jun: 6,
  junho: 6,
  "7": 7,
  "07": 7,
  jul: 7,
  julho: 7,
  "8": 8,
  "08": 8,
  ago: 8,
  agosto: 8,
  "9": 9,
  "09": 9,
  set: 9,
  setembro: 9,
  "10": 10,
  out: 10,
  outubro: 10,
  "11": 11,
  nov: 11,
  novembro: 11,
  "12": 12,
  dez: 12,
  dezembro: 12,
};

function parseAno(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const raw = ((value as any)?.display || (value as any)?.name || "").toString();
  const parsed = Number(raw.replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMes(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const key = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return MESES[key] ?? Number(value);
  }
  const raw = (((value as any)?.display || (value as any)?.name || "") as string)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return MESES[raw] ?? 0;
}

function parseMesAnoStr(value: unknown): { mes: number; ano: number } | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^\s*([01]?\d)\s*\/\s*(\d{4})\s*$/);
  if (!match) return null;

  const mes = Number(match[1]);
  const ano = Number(match[2]);
  if (mes >= 1 && mes <= 12 && ano > 1900) return { mes, ano };
  return null;
}

function parseValorBR(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  const normalized = value
    .replace(/\s+/g, "")
    .replace(/[R$\u00A0]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

type BubbleRef = string | { _id?: string } | null | undefined;

function refToId(value: BubbleRef): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value._id === "string") return value._id;
  return null;
}

function refToIds(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => refToId(item as BubbleRef))
      .filter((id): id is string => !!id);
  }
  const id = refToId(value as BubbleRef);
  return id ? [id] : [];
}

const CAT_ID_TO_KEY: Record<string, string> = {
  "1754514204139x526063856276349100": "folha_pagamento",
  "1751034502993x140272905276620800": "veiculos",
  "1751034541896x868439199319326700": "telefone",
  "1751034431059x728921665608876000": "pitney",
  "1751034441316x205655876634673150": "impostos",
  "1751034473039x889328518957629400": "honorarios",
  "1751034485642x432154856311750660": "extras",
  "1751034521134x718767032318296000": "aluguel",
  "1751034565744x102496125839998980": "comissoes",
  "1754070490704x231856758205448200": "aluguel",
  "1754070514400x329889315937845250": "comissoes",
  "1754070456208x252559865169575940": "extras",
  "1754070443985x667206317484277800": "honorarios",
  "1754070430759x682734868761149400": "impostos",
  "1754070420062x128183682507735040": "pitney",
  "1754070502210x652422025222553600": "telefone",
  "1754070474958x145718347264426000": "veiculos",
  "1755707826761x652862801132216600": "folha_pagamento",
  "1755695251313x921435259610147000": "aluguel",
  "1755695225576x725117049811793400": "comissoes",
  "1755695134198x500541998866248700": "extras",
  "1755695100227x210629430516269020": "honorarios",
  "1755695074934x439006081075832060": "impostos",
  "1755695046174x268899668131042720": "pitney",
  "1755695193899x693528764351259500": "telefone",
  "1755695164261x607361797055734100": "veiculos",
  "1755695521004x217825384616417760": "folha_pagamento",
};

function normalizeCategoriaFromMeta(nomeCategoria: string, descricao: string, categoriaId?: string) {
  if (categoriaId && CAT_ID_TO_KEY[categoriaId]) {
    return CAT_ID_TO_KEY[categoriaId];
  }

  const categoriaNormalizada = String(nomeCategoria || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const directMap: Record<string, string> = {
    aluguel: "aluguel",
    comissao: "comissoes",
    comissoes: "comissoes",
    extras: "extras",
    honorario: "honorarios",
    honorarios: "honorarios",
    imposto: "impostos",
    impostos: "impostos",
    pitney: "pitney",
    telefone: "telefone",
    telefonia: "telefone",
    veiculo: "veiculos",
    veiculos: "veiculos",
    "folha pgto": "folha_pagamento",
    "folha pgto.": "folha_pagamento",
    "folha pagamento": "folha_pagamento",
  };

  if (directMap[categoriaNormalizada]) {
    return directMap[categoriaNormalizada];
  }

  if (categoriaNormalizada.includes("alug")) return "aluguel";
  if (categoriaNormalizada.includes("comis")) return "comissoes";
  if (categoriaNormalizada.includes("honor")) return "honorarios";
  if (categoriaNormalizada.includes("pitney")) return "pitney";
  if (categoriaNormalizada.includes("telef")) return "telefone";
  if (categoriaNormalizada.includes("veic")) return "veiculos";
  if (
    categoriaNormalizada.includes("impost") ||
    categoriaNormalizada === "pis" ||
    categoriaNormalizada === "cofins" ||
    categoriaNormalizada === "irrf" ||
    categoriaNormalizada.includes("iss")
  ) {
    return "impostos";
  }
  if (
    categoriaNormalizada.includes("folha") ||
    categoriaNormalizada.includes("pgto") ||
    categoriaNormalizada.includes("pagament")
  ) {
    return "folha_pagamento";
  }
  if (categoriaNormalizada.includes("extra")) return "extras";

  const descricaoNormalizada = String(descricao || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/(pis|cofins|irrf|iss)/.test(descricaoNormalizada)) return "impostos";
  if (/(uber|post[oa]|estaciona|motoboy|pedag|sem parar|km|combust)/.test(descricaoNormalizada)) return "veiculos";
  if (/(vivo|claro|america\s*net|telefonica|tim|oi|celular|fixo)/.test(descricaoNormalizada)) return "telefone";
  if (/(pitney|locacao|manuten|tinta|material|servic)/.test(descricaoNormalizada)) return "pitney";
  if (/(dr|doutor|medico|advog|contab)/.test(descricaoNormalizada)) return "honorarios";
  if (/(omega|unifisa|ewd|emilio|ghisso|comiss)/.test(descricaoNormalizada)) return "comissoes";
  if (/(aluguel|shopping)/.test(descricaoNormalizada)) return "aluguel";

  return "extras";
}

async function bubbleFetch(path: string) {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Bubble GET ${path} -> ${response.status} ${body}`);
  }

  return response.json();
}

async function bubbleGetAll<T>(type: string, cons?: unknown, limit = 1000): Promise<T[]> {
  const items: T[] = [];
  let cursor: number | undefined;

  while (true) {
    const queryParts = [`limit=${limit}`];
    if (cons) queryParts.push(`constraints=${constraints(cons)}`);
    if (typeof cursor === "number") queryParts.push(`cursor=${cursor}`);

    const data = await bubbleFetch(`/api/1.1/obj/${enc(type)}?${queryParts.join("&")}`);
    const response = data?.response;
    if (!response) break;

    const batch = (response.results || []) as T[];
    items.push(...batch);

    const remaining = Number(response.remaining ?? 0);
    if (remaining > 0) {
      cursor = Number(response.cursor ?? 0) + (batch.length || 0);
    } else {
      break;
    }
  }

  return items;
}

async function bubbleGetOne<T>(type: string, id: string): Promise<T | null> {
  const data = await bubbleFetch(`/api/1.1/obj/${enc(type)}/${enc(id)}`);
  return data?.response ? (data.response as T) : null;
}

async function bubbleGetManyByIds<T>(type: string, ids: string[]): Promise<T[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const records = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        return await bubbleGetOne<T>(type, id);
      } catch {
        return null;
      }
    })
  );
  return records.filter(Boolean) as T[];
}

type AgfRecord = { _id: string; ["Nome da AGF"]?: string; nome?: string; name?: string };
type UserRecord = {
  AGF?: BubbleRef;
  ["AGF Principal"]?: BubbleRef;
  ["Socio em"]?: BubbleRef[] | BubbleRef;
};
type SocioRecord = { AGF?: BubbleRef };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const empresaId = searchParams.get("empresa_id");

    if (!userId && !empresaId) {
      return NextResponse.json(
        { error: "Parametro ausente: informe ?user_id=... (recomendado) ou ?empresa_id=..." },
        { status: 400 }
      );
    }

    let agfList: AgfRecord[] = [];

    if (userId) {
      const agfMap = new Map<string, AgfRecord>();
      const addAgfs = (items: AgfRecord[]) => {
        for (const item of items) {
          if (item?._id) agfMap.set(item._id, item);
        }
      };

      const agfsFromListaUsuarios = await bubbleGetAll<AgfRecord>(
        "AGF",
        [{ key: "Lista de Usuários", constraint_type: "contains", value: userId }],
        1000
      ).catch(() => []);
      addAgfs(agfsFromListaUsuarios);

      const userRecord = await bubbleGetOne<UserRecord>("User", userId).catch(() => null);
      const relatedAgfIds = new Set<string>([
        ...refToIds(userRecord?.AGF),
        ...refToIds(userRecord?.["AGF Principal"]),
        ...refToIds(userRecord?.["Socio em"]),
      ]);

      const sociosRows = await bubbleGetAll<SocioRecord>(
        "Socios",
        [{ key: "Nome", constraint_type: "equals", value: userId }],
        1000
      ).catch(() => []);
      for (const row of sociosRows) {
        const agfId = refToId(row.AGF);
        if (agfId) relatedAgfIds.add(agfId);
      }

      if (relatedAgfIds.size > 0) {
        const agfsFromRelations = await bubbleGetManyByIds<AgfRecord>("AGF", Array.from(relatedAgfIds));
        addAgfs(agfsFromRelations);
      }

      agfList = Array.from(agfMap.values());
    } else {
      agfList = await bubbleGetAll<AgfRecord>(
        "AGF",
        [{ key: "Empresa Mãe", constraint_type: "equals", value: empresaId }],
        1000
      );
    }

    const agfs = agfList
      .map((agf) => {
        const nomeRaw = (agf as any)["Nome da AGF"] || (agf as any).nome || (agf as any).name || agf._id;
        return { id: agf._id, nome: normAgfName(nomeRaw) };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const agfIdToNome = new Map<string, string>(agfs.map((agf) => [agf.id, agf.nome]));
    const agfIds = agfs.map((agf) => agf.id);

    if (agfIds.length === 0) {
      return NextResponse.json({
        agfs: [],
        categoriasDespesa: [
          "aluguel",
          "comissoes",
          "extras",
          "honorarios",
          "impostos",
          "pitney",
          "telefone",
          "veiculos",
          "folha_pagamento",
        ],
        dados: {},
      });
    }

    let lmList: Array<{
      _id: string;
      Ano: unknown;
      ["Mês"]: unknown;
      AGF: BubbleRef;
      Data?: string;
      total_receita?: number;
      total_despesa?: number;
      resultado_final?: number;
    }> = [];

    if (userId) {
      lmList = await bubbleGetAll(
        "LançamentoMensal",
        [{ key: "AGF", constraint_type: "in", value: agfIds }],
        1000
      );
    } else {
      lmList = await bubbleGetAll(
        "LançamentoMensal",
        [{ key: "Empresa Mãe", constraint_type: "equals", value: empresaId }],
        1000
      );
    }

    const lmIndex = new Map<string, { ano: number; mes: number; agfId?: string; agfNome: string }>();
    for (const lm of lmList) {
      const ano = parseAno((lm as any).Ano) || parseAno((lm as any).Data?.split?.("/")[1]);
      const mes = parseMes((lm as any)["Mês"]) || Number((lm as any).Data?.split?.("/")?.[0]);
      const agfId = refToId(lm.AGF) || undefined;
      const agfNome = normAgfName(agfIdToNome.get(agfId || "") || agfId || "AGF");
      lmIndex.set(lm._id, { ano, mes, agfId, agfNome });
    }

    const catList = await bubbleGetAll<{
      _id: string;
      Categoria?: string;
      Nome?: string;
      name?: string;
      nome?: string;
      ["Descrição"]?: string;
      descricao?: string;
    }>("Categoria Despesa", undefined, 2000);

    const catIdToNome = new Map<string, string>(
      catList.map((cat) => {
        const nome =
          (cat as any).Categoria ||
          (cat as any).Nome ||
          (cat as any).name ||
          (cat as any).nome ||
          (cat as any)["Descrição"] ||
          (cat as any).descricao ||
          "";
        return [cat._id, String(nome)] as const;
      })
    );

    const scList = await bubbleGetAll<{
      _id: string;
      AGF: BubbleRef;
      ["LançamentoMesnal"]?: BubbleRef | { _id?: string; Ano?: unknown; ["Mês"]?: unknown; AGF?: BubbleRef };
      ["LançamentoMensal"]?: BubbleRef | { _id?: string; Ano?: unknown; ["Mês"]?: unknown; AGF?: BubbleRef };
      ["Lançamento Mensal"]?: BubbleRef | { _id?: string; Ano?: unknown; ["Mês"]?: unknown; AGF?: BubbleRef };
      Categoria?: unknown;
      Valor: number | string;
      ["Descrição"]?: string;
      descricao?: string;
    }>("Despesa (SubConta)", [{ key: "AGF", constraint_type: "in", value: agfIds }], 1000);

    const missingCatIds = Array.from(
      new Set(
        scList
          .map((item) => (typeof (item as any).Categoria === "string" ? (item as any).Categoria : null))
          .filter((id): id is string => !!id && !catIdToNome.has(id))
      )
    );

    for (const catId of missingCatIds) {
      try {
        const item = await bubbleGetOne<any>("Categoria Despesa", catId);
        const nome = item?.Categoria || item?.Nome || item?.name || item?.nome || "";
        if (nome) catIdToNome.set(catId, String(nome));
      } catch {
        // ignore missing categories
      }
    }

    const scLmIds = Array.from(
      new Set(
        scList
          .map((item) => {
            const lmField =
              (item as any)["LançamentoMesnal"] ??
              (item as any)["LançamentoMensal"] ??
              (item as any)["Lançamento Mensal"];
            return typeof lmField === "string" ? lmField : lmField?._id || null;
          })
          .filter((id): id is string => typeof id === "string")
      )
    );

    const missingLmIds = scLmIds.filter((id) => !lmIndex.has(id));
    for (const lmId of missingLmIds) {
      try {
        const item = await bubbleGetOne<any>("LançamentoMensal", lmId);
        if (!item) continue;
        const ano = parseAno(item.Ano) || parseAno(item?.Data?.split?.("/")?.[1]);
        const mes = parseMes(item["Mês"]) || Number(item?.Data?.split?.("/")?.[0]);
        const agfId = refToId(item.AGF) || undefined;
        const agfNome = normAgfName(agfIdToNome.get(agfId || "") || agfId || "AGF");
        lmIndex.set(lmId, { ano, mes, agfId, agfNome });
      } catch {
        // ignore missing launch records
      }
    }

    const balList = await bubbleGetAll<{
      _id: string;
      ["Lançamento Mensal"]?: BubbleRef | { _id?: string; Ano?: unknown; ["Mês"]?: unknown; AGF?: BubbleRef };
      Quantidade?: number | string;
    }>(
      "Balancete",
      [
        { key: "Lançamento Mensal", constraint_type: "in", value: Array.from(lmIndex.keys()) },
        { key: "Tipo de objeto", constraint_type: "equals", value: "Total" },
      ],
      1000
    );

    const categoriasDespesa = [
      "aluguel",
      "comissoes",
      "extras",
      "honorarios",
      "impostos",
      "pitney",
      "telefone",
      "veiculos",
      "folha_pagamento",
    ];

    const dados: Record<
      number,
      Record<
        number,
        Record<
          string,
          {
            receita: number;
            objetos: number;
            despesa_total: number;
            despesas: Record<string, number>;
            despesa_subcontas_total?: number;
          }
        >
      >
    > = {};

    const ensure = (ano: number, mes: number, agfNome: string) => {
      const key = normAgfName(agfNome);
      if (!dados[ano]) dados[ano] = {};
      if (!dados[ano][mes]) dados[ano][mes] = {};
      if (!dados[ano][mes][key]) {
        dados[ano][mes][key] = {
          receita: 0,
          objetos: 0,
          despesa_total: 0,
          despesas: Object.fromEntries(categoriasDespesa.map((categoria) => [categoria, 0])),
        };
      }
      return dados[ano][mes][key];
    };

    for (const lm of lmList) {
      const meta = lmIndex.get(lm._id);
      if (!meta) continue;
      if (!meta.ano || !meta.mes) continue;

      const entry = ensure(meta.ano, meta.mes, meta.agfNome);
      entry.receita += Number((lm as any).total_receita || 0);
      entry.despesa_total += Number((lm as any).total_despesa || 0);
    }

    for (const bal of balList) {
      const lmField = (bal as any)["Lançamento Mensal"];
      let ano = 0;
      let mes = 0;
      let agfNome = "AGF";

      if (typeof lmField === "string") {
        const meta = lmIndex.get(lmField);
        if (!meta) continue;
        ano = meta.ano;
        mes = meta.mes;
        agfNome = meta.agfNome;
      } else if (typeof lmField === "object" && lmField) {
        ano = parseAno((lmField as any).Ano);
        mes = parseMes((lmField as any)["Mês"]);
        const agfId = refToId((lmField as any).AGF);
        agfNome = normAgfName(agfIdToNome.get(agfId || "") || agfNome);
      }

      if (!ano || !mes) continue;

      const entry = ensure(ano, mes, agfNome);
      entry.objetos += parseValorBR((bal as any).Quantidade);
    }

    for (const sc of scList) {
      const lmField =
        (sc as any)["LançamentoMesnal"] ??
        (sc as any)["LançamentoMensal"] ??
        (sc as any)["Lançamento Mensal"];

      let ano = 0;
      let mes = 0;
      let agfNome = "AGF";

      if (typeof lmField === "string") {
        const meta = lmIndex.get(lmField);
        if (meta) {
          ano = meta.ano;
          mes = meta.mes;
          agfNome = meta.agfNome;
        } else {
          const parsed = parseMesAnoStr(lmField);
          if (parsed) {
            ano = parsed.ano;
            mes = parsed.mes;
          }
        }
      } else if (typeof lmField === "object" && lmField) {
        ano = parseAno((lmField as any).Ano);
        mes = parseMes((lmField as any)["Mês"]);
        const agfId = refToId((lmField as any).AGF);
        agfNome = normAgfName(agfIdToNome.get(agfId || "") || agfNome);
      }

      if ((sc as any).AGF) {
        const agfId = refToId((sc as any).AGF);
        agfNome = normAgfName(agfIdToNome.get(agfId || "") || agfNome);
      }

      if (!ano || !mes) continue;

      const entry = ensure(ano, mes, agfNome);
      let nomeCategoria = "";
      const categoriaRaw = (sc as any).Categoria;

      if (categoriaRaw) {
        if (typeof categoriaRaw === "string") {
          nomeCategoria = catIdToNome.get(categoriaRaw) || "";
        } else if (typeof categoriaRaw === "object") {
          nomeCategoria =
            (categoriaRaw as any).Categoria ||
            (categoriaRaw as any).Nome ||
            (categoriaRaw as any).name ||
            (categoriaRaw as any).nome ||
            "";
        } else if (typeof categoriaRaw === "number") {
          nomeCategoria = String(categoriaRaw);
        }
      }

      const descricao = (sc as any)["Descrição"] ?? (sc as any).descricao ?? "";
      let categoria = normalizeCategoriaFromMeta(
        nomeCategoria,
        descricao,
        typeof categoriaRaw === "string" ? categoriaRaw : undefined
      );

      if (!categoriasDespesa.includes(categoria)) {
        categoria = "extras";
      }

      const valor = parseValorBR((sc as any).Valor);
      entry.despesas[categoria] = (entry.despesas[categoria] || 0) + valor;
      entry.despesa_subcontas_total = (entry.despesa_subcontas_total || 0) + valor;
    }

    for (const anoStr of Object.keys(dados)) {
      const ano = Number(anoStr);
      for (const mesStr of Object.keys(dados[ano])) {
        const mes = Number(mesStr);
        for (const agfNome of Object.keys(dados[ano][mes])) {
          const item = dados[ano][mes][agfNome];
          item.receita = Number(item.receita || 0);
          item.objetos = Number(item.objetos || 0);
          item.despesa_total = Number(item.despesa_total || 0);
          for (const categoria of categoriasDespesa) {
            item.despesas[categoria] = Number(item.despesas[categoria] || 0);
          }
          item.despesa_subcontas_total = Number(item.despesa_subcontas_total || 0);
        }
      }
    }

    return NextResponse.json({
      agfs,
      categoriasDespesa,
      dados,
    });
  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: error.message || "Erro Interno do Servidor" }, { status: 500 });
  }
}

