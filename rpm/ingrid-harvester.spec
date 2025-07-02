Name:                       ingrid-harvester
Version:                    0.0.0
Release:                    dev
Summary:                    InGrid Harvester
Group:                      Applications/Internet
License:                    Proprietary
URL:                        https://www.wemove.com/
BuildArch:                  noarch
AutoReqProv:                no
Requires:                   nodejs >= 20

%define target              %{buildroot}/opt/ingrid/ingrid-harvester
%define systemd_dir         /usr/lib/systemd/system
%define ingrid_unit_name    ingrid-harvester.service
%define ingrid_service      %{systemd_dir}/%{ingrid_unit_name}

%description
InGrid API

%prep

%build
# nothing to do

%install
rm -Rf %{buildroot}*

mkdir -p %{target}
cp -r /server/build/server %{target}
find /server -maxdepth 1 -type f -exec cp {} %{target}/server \;
cp -r /server/node_modules %{target}/server/node_modules
cp -r /client %{target}/server/app/webapp


# Copy over the systemd unit file
mkdir -p %{buildroot}%{systemd_dir}
cp /rpm/%{ingrid_unit_name} %{buildroot}%{systemd_dir}

%files
%defattr(0644,ingrid,ingrid,0755)
%attr(0755,ingrid,ingrid) /opt/ingrid/ingrid-harvester
%attr(0644,root,root) %{ingrid_service}

################################################################################
%pre
# Scriptlet that is executed just before the package is installed on the target
# system.
if [ -f "/etc/systemd/system/ingrid-harvester.service" ]; then
  service ingrid-harvester stop
fi

# Delete old files and libs
#for dir in %{install_root}/%{ingrid_name}/conf \
#    %{install_root}/%{ingrid_name}/lib \
#    %{install_root}/%{ingrid_name}/logs; do
#
## Don't use `test' here. If the last directory doesn't exist, then a non-zero
## exit code from test will cause the installation to fail.
#    if [ -d "$dir" ]; then
#        rm -Rf "$dir"/*
#    fi
#done

################################################################################
%preun
if [ -f "/etc/systemd/system/ingrid-harvester.service" ]; then
  service ingrid-harvester stop
fi

################################################################################
%postun


%changelog
