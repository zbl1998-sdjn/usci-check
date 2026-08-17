# AGENTS.md — usci-check

## 这个仓库是什么、归属谁

- **用途**:currawongweb.com 站内 USCI 校验器的**站外开源分发物**(OSS/Show HN 渠道),
  2026-08-17 由资产所有者指示建立。获客逻辑:回链 + 品牌可见度,见
  `../ShowHN-发布包-usci-check-2026-08-17.md`。
- **归属**:`ai赚钱计划/oss/` 下的独立 git 仓库(工作区惯例:每个代码子项目独立建仓),
  公开于 https://github.com/zbl1998-sdjn/usci-check 。它**不属于** studio-site,
  不纳入 studio-site 的 `npm run check` 门禁。

## 与 studio-site 的关系(单向,禁止反向)

- 算法**提取自** `studio-site/assets/usci-core.js`(数据表机械复制以避免转录错误;
  注释英文化;删去了站内专属的 `resolveSubjectKey`/`canonicalCreditCode`)。
- **studio-site 不得 import 本仓库**;本仓库也不 import studio-site 的任何文件。
  两份实现允许各自演进;若上游 `usci-core.js` 修了算法级错误(权重表/字符集),
  需**手工**同步到这里并加测试——先改测试钉住,再改实现。

## 本仓库自己的门禁

- `node --test`(11 用例,含权重表逐项对 `Wi=3^(i-1) mod 31` 复算、
  全 18 位 × 30 字符单字符损坏全检)。改任何实现前先跑绿,提交前再跑绿。
- 零运行时依赖是刻意的,不得引入第三方包。

## 红线(继承全站口径)

- `proves` / `doesNotProve` 双输出是本库存在的理由,任何改动不得省略或弱化后者;
- 不加"风险评分"、不做注册状态查询(README 最后一节的立场);
- 不重新分发 2,149 码原始数据(方法页给复现路径,原始逐司数据不入 git ——
  与工作区既有数据边界一致)。

## 验收证据

- 2026-08-17 发布:`node --test` 11/11 绿、CLI 实跑正常、`gh repo create` 回执、
  `curl` 公开可达(repo 页 200 / raw README 命中)——记录在
  `../ShowHN-发布包-usci-check-2026-08-17.md` 第 1 节与当日会话。
- 2,149 真实码端到端验证:上游证据 `studio-site/.ai/usci-end-to-end-verification-2026-08-11.json`。
