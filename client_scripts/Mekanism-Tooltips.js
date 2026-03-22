// This File has been authored by AllTheMods Staff, or a Community contributor for use in AllTheMods - AllTheMods 10 LITE.
// As all AllTheMods packs are licensed under All Rights Reserved, this file is not allowed to be used in any public packs not released by the AllTheMods Team, without explicit permission.

ItemEvents.modifyTooltips(allthemods => {

    // ##### Gear #####

    //Mekasuit
    allthemods.add(/mekanism:mekasuit_/, [
        Text.red('Tăng tiêu thụ năng lượng!'),
        Text.green('Tăng dung lượng năng lượng')
    ])
    //Meka Tool
    allthemods.add('mekanism:meka_tool', [
        Text.red('Tăng tiêu thụ năng lượng!'),
        Text.green('Tăng dung lượng năng lượng!'),
        Text.green('Tăng tốc độ tấn công & sát thương!')
    ])

    // ##### Generators #####

    //Solar Generator
    allthemods.add('mekanismgenerators:solar_generator', [
        Text.green('Tăng dung lượng & sản xuất năng lượng!')
    ])
    //Advanced Solar Generator
    allthemods.add('mekanismgenerators:advanced_solar_generator', [
        Text.green('Tăng dung lượng & sản xuất năng lượng!')
    ])
    //Wind Generator
    allthemods.add('mekanismgenerators:wind_generator', [
        Text.green('Tăng dung lượng & sản xuất năng lượng!')
    ])
    //Heat Generator
    allthemods.add('mekanismgenerators:heat_generator', [
        Text.green('Tăng dung lượng & sản xuất năng lượng!')
    ])
    //Gas Burning Generator
    allthemods.add('mekanismgenerators:gas_burning_generator', [
        Text.red('Giảm sản xuất năng lượng!'),
        Text.red('Tăng tiêu thụ nhiên liệu!')
    ])
    //Fission Generator
    allthemods.add(/mekanismgenerators:fission_/, [
        Text.red('Giảm sản xuất năng lượng!'),
    ])
    //Fusion Generator
    allthemods.add(/mekanismgenerators:fusion_/, [
        Text.red('Giảm sản xuất năng lượng!'),
        Text.green('Giảm tiêu thụ nhiên liệu!'),
    ])
    //Turbine
    allthemods.add(/mekanismgenerators:turbine_/, [
        Text.green('Tăng tốc độ sản xuất!'),
    ])
    //Boiler
    allthemods.add(/mekanism:boiler_/, [
        Text.green('Tăng tốc độ sản xuất!'),
    ])

    // ##### Machines #####

    //Upgrades
    allthemods.add(/mekanism:upgrade_/, [
        Text.green('Tăng hiệu suất máy móc!')
    ])
    //Waste Barrel
    allthemods.add('mekanism:radioactive_waste_barrel', [
        Text.green('Tăng tốc độ phân rã!')
    ])
    //Thermal Evaporation Tower
    allthemods.add(/mekanism:thermal_evaporation_/, [
        Text.green('Tăng tốc độ sản xuất!')
    ])
    //Solar Neutron Activator
    allthemods.add('mekanism:solar_neutron_activator', [
        Text.green('Tăng tốc độ sản xuất!'),
        Text.green('Chất thải -> Polonium được cải thiện!')
    ])
    //Isotopic Centrifuge
    allthemods.add('mekanism:isotopic_centrifuge', [
        Text.green('Chất thải -> Plutonium được cải thiện!')
    ])
    //Electric Pump
    allthemods.add('mekanism:electric_pump', [
        Text.green('Tăng tốc độ sản xuất!')
    ])
    //SPS
    allthemods.add(/mekanism:sps_/, [
        Text.green('Giảm tiêu thụ năng lượng!')
    ])
})

// This File has been authored by AllTheMods Staff, or a Community contributor for use in AllTheMods - AllTheMods 10 LITE.
// As all AllTheMods packs are licensed under All Rights Reserved, this file is not allowed to be used in any public packs not released by the AllTheMods Team, without explicit permission.