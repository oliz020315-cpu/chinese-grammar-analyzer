# 中国大陆部署说明

## 结论

当前项目页面运行依赖已经**全部本地化**：

- 字体：本地 `css/fonts.css` + `lib/fonts/`
- 图表库：本地 `lib/chart.umd.min.js`
- 页面运行时：无 Google Fonts、无 jsDelivr、无 unpkg、无其他外部 CDN 依赖

所以：

> **如果国内其他用户还是打不开，问题基本不在项目代码，而在你当前使用的托管平台、站点域名或网络线路。**

---

## 为什么会这样

静态网站能不能在中国大陆稳定打开，通常取决于：

1. **托管平台是否在海外**
2. **访问域名是否在部分网络下不稳定**
3. **是否依赖海外边缘节点分发**
4. **是否使用 `github.io`、`jsdelivr.net`、`unpkg.com` 一类不适合作为大陆主站的地址**

这类问题即使页面代码完全正确，也照样会发生。

---

## 推荐部署方案

### 方案 A：腾讯云 CloudBase 静态托管
适合：想尽快上线一个中国大陆可访问的演示站。

优点：
- 上手快
- 适合纯静态前端
- 不需要额外改代码

部署时上传这些内容即可：
- `index.html`
- `css/`
- `js/`
- `lib/`
- 其他根目录文件（README、LICENSE 可选）

---

### 方案 B：腾讯云 COS 静态网站托管
适合：纯静态网站正式发布。

优点：
- 成本低
- 稳定
- 可配合 CDN

注意：
- 如果你要绑定中国大陆自定义域名，通常还需要备案
- 上传时要保留完整目录结构，尤其是 `lib/fonts/`

---

### 方案 C：自有服务器 / 宝塔 / Nginx
适合：正式长期使用，最稳。

最小 Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/chinese-grammar-analyzer;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

---

## 不建议作为中国大陆主站的方案

以下方案可以做备用站或源码展示，但**不建议作为中国大陆用户主入口**：

- GitHub Pages
- `github.io` 域名
- jsDelivr
- unpkg
- 其他以海外节点为主的免费静态托管

原因不是“代码错了”，而是**平台线路本身就可能不稳定**。

---

## 发布前检查清单

上线前确认：

- [ ] `index.html` 已上传
- [ ] `css/style.css` 已上传
- [ ] `css/fonts.css` 已上传
- [ ] `js/` 整个目录已上传
- [ ] `lib/chart.umd.min.js` 已上传
- [ ] `lib/fonts/` 整个目录已上传
- [ ] 浏览器开发者工具 Network 中没有 404
- [ ] 线上地址不是 `github.io` 主站

---

## 你现在最应该做的事

如果你现在的线上地址挂在：
- GitHub Pages
- `username.github.io/...`
- 海外静态托管平台默认域名

那最直接的修复不是继续改前端代码，而是：

> **把同一套文件原样迁移到国内可访问的静态托管平台。**

这个项目已经是纯静态结构，迁移成本很低。

---

## 一句话判断

- **本地双击能打开** + **国内别人线上打不开** → 大概率是部署平台问题
- **本地和线上都打不开** → 才更可能是代码或文件缺失问题
