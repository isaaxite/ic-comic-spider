# ic-comic-spider
a script to get the comic from xxx

## 安装
```
npm i -g icsdr
```

## 快速使用
- 登录 [http://www.verydm.com](http://www.verydm.com) 找需要的漫画，复制目录页链接，例如《亚人》的目录：http://www.verydm.com/manhua/yaren

- 下载漫画
```
icsdr http://www.verydm.com/manhua/yaren
```
可下载多个，空格分隔

## 更多下载选项
```
# 直接读取配置下载漫画
icsdr

# 当前目录下生成配置模板
icsdr -i

# 搜索漫画
icsdr -s 一拳超人

# 下载漫画
icsdr http://www.verydm.com/manhua/yiquanchaoren

# 下载多个
# 此方式不能配合其他命令一起使用，需要使用 -l 命令。
icsdr http://www.verydm.com/manhua/yaren http://www.verydm.com/manhua/kuangduzhiyuan
// or
icsdr -l http://www.verydm.com/manhua/kuangduzhiyuan http://www.verydm.com/manhua/kuangduzhiyuan

```


## License

MIT
